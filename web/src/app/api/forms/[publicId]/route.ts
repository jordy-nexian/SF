import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { defaultTheme, type ThemeConfig } from '@/types/theme';
import { selectVersion, type VersionWeight } from '@/lib/ab-testing';
import { validateFormAccessToken } from '@/lib/form-access-token';
import { verifyPrefillToken, type PrefillTokenPayload } from '@/lib/prefill-token';
import { getPortalSessionFromCookies } from '@/lib/portal-auth';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	try {
		const { publicId } = await context.params;
		// Accept either publicId slug OR internal id (covers QB storing either value)
		const form = await prisma.form.findFirst({
			where: { OR: [{ publicId }, { id: publicId }] },
			include: {
				currentVersion: true,
				versions: {
					select: {
						id: true,
						versionNumber: true,
						trafficWeight: true,
						schema: true,
						htmlContent: true,
					},
				},
				tenant: {
					select: {
						id: true,
						settings: true,
					},
				},
			},
		});

		if (!form) {
			return api.formNotFound();
		}

		// Only live forms are publicly accessible (draft forms show helpful message)
		if (form.status === 'draft') {
			return api.formNotPublished();
		}

		if (form.status === 'archived') {
			return api.formArchived();
		}

		// Check for prefill context token (wizard-assigned forms)
		const ctxParam = request.nextUrl.searchParams.get('ctx');
		let ctxPayload: PrefillTokenPayload | null = null;
		if (ctxParam) {
			ctxPayload = await verifyPrefillToken(ctxParam, publicId);
			if (!ctxPayload) {
				return api.forbidden('Invalid or expired form link. Please request a new one.');
			}
			if (ctxPayload.t !== form.tenantId) {
				return api.forbidden('Form link is not valid for this form');
			}
		}

		// Check if form is public (defaults to true for backwards compatibility)
		const formSettings = form.settings as { isPublic?: boolean } | null;
		const isPublic = formSettings?.isPublic ?? true;

		// Security: Block access to private forms without valid token or portal session
		if (!isPublic) {
			if (ctxPayload) {
				// Valid prefill context token grants access
			} else {
				const token = request.nextUrl.searchParams.get('token');

				if (token) {
					// Validate access token
					const tokenPayload = await validateFormAccessToken(token, publicId);

					if (!tokenPayload) {
						return api.forbidden('Invalid or expired access token');
					}

					// Verify token is for this tenant's form
					if (tokenPayload.tenantId !== form.tenantId) {
						return api.forbidden('Access token is not valid for this form');
					}
				} else {
					// No token - check for portal session as fallback
					const portalSession = await getPortalSessionFromCookies(request.cookies);

					if (!portalSession) {
						// Return 401 so frontend can show magic link request flow
						return api.unauthorized('Authentication required to access this form');
					}

					// Verify portal session is for this tenant
					if (portalSession.tenantId !== form.tenantId) {
						return api.forbidden('You do not have access to this form');
					}

					// Verify user is assigned to this form
					const assignment = await prisma.formAssignment.findFirst({
						where: {
							formId: form.id,
							endCustomerId: portalSession.endCustomerId,
						},
					});

					if (!assignment) {
						return api.forbidden('This form has not been assigned to you');
					}
				}
			}
		}

		// Check for A/B test
		const abVersions: VersionWeight[] = form.versions
			.filter((v) => v.trafficWeight > 0)
			.map((v) => ({
				versionId: v.id,
				versionNumber: v.versionNumber,
				weight: v.trafficWeight,
			}));

		// Track selected version info (we need schema, htmlContent, and versionNumber)
		let selectedVersion: { schema: unknown; htmlContent: string | null; versionNumber: number } | null = null;

		// If A/B test is active, select version based on weights
		if (abVersions.length > 0) {
			const selectedId = selectVersion(abVersions, form.currentVersionId);
			if (selectedId) {
				const found = form.versions.find((v) => v.id === selectedId);
				if (found) {
					selectedVersion = {
						schema: found.schema,
						htmlContent: found.htmlContent,
						versionNumber: found.versionNumber
					};
				}
			}
		}

		// Use current version if no A/B selection
		if (!selectedVersion && form.currentVersion) {
			selectedVersion = {
				schema: form.currentVersion.schema,
				htmlContent: (form.currentVersion as any).htmlContent || null,
				versionNumber: form.currentVersion.versionNumber,
			};
		}

		// Fallback to highest version if no current version
		if (!selectedVersion && form.versions.length > 0) {
			const sorted = [...form.versions].sort((a, b) => b.versionNumber - a.versionNumber);
			selectedVersion = {
				schema: sorted[0].schema,
				htmlContent: sorted[0].htmlContent,
				versionNumber: sorted[0].versionNumber
			};
		}

		if (!selectedVersion) {
			return api.notFound('Form has no published versions');
		}

		// Get theme from tenant settings or use default
		const tenantSettings = form.tenant.settings as { theme?: Partial<ThemeConfig> } | null;
		const theme = tenantSettings?.theme
			? { ...defaultTheme, ...tenantSettings.theme }
			: defaultTheme;

		const settings = {
			showProgressBar: true,
			showStepNumbers: true,
		};

		// Include Turnstile site key if configured
		const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

		// Derive token modes from template mappings when ctx token provides prefill data
		let ctxPrefillData: Record<string, string> | undefined;
		let ctxTokenModes: Record<string, string> | undefined;
		let ctxCustomerContext: PrefillTokenPayload['c'] | undefined;
		let ctxWipContext: Record<string, unknown> | undefined;

		if (ctxPayload) {
			ctxPrefillData = ctxPayload.v;
			ctxCustomerContext = ctxPayload.c;

			// Expand compact document context to readable keys for frontend/submission
			if (ctxPayload.d) {
				ctxWipContext = {};
				if (ctxPayload.d.cn !== undefined) ctxWipContext.companyName = ctxPayload.d.cn;
				if (ctxPayload.d.wn !== undefined) ctxWipContext.wipNumber = ctxPayload.d.wn;
				if (ctxPayload.d.md) ctxWipContext.metadata = ctxPayload.d.md;
			}

			if (form.templateId) {
				const mappings = await prisma.tokenMapping.findMany({
					where: { templateId: form.templateId },
					select: { tokenId: true, mode: true },
				});
				ctxTokenModes = {};
				for (const m of mappings) {
					ctxTokenModes[m.tokenId] = m.mode || 'prefill';
				}
			}
		}

		return api.success({
			formId: form.id,
			formVersion: selectedVersion.versionNumber,
			schema: selectedVersion.schema,
			htmlContent: selectedVersion.htmlContent,
			theme,
			settings,
			thankYouUrl: form.thankYouUrl,
			thankYouMessage: form.thankYouMessage,
			turnstileSiteKey,
			isPublic,
			...(ctxPrefillData && { prefillData: ctxPrefillData }),
			...(ctxTokenModes && { tokenModes: ctxTokenModes }),
			...(ctxCustomerContext && { customerContext: ctxCustomerContext }),
			...(ctxWipContext && { wipContext: ctxWipContext }),
		});
	} catch (err) {
		console.error('Error fetching form:', err);
		return api.internalError('Failed to load form');
	}
}


