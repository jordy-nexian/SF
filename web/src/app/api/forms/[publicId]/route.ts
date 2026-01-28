import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { defaultTheme, type ThemeConfig } from '@/types/theme';
import { selectVersion, type VersionWeight } from '@/lib/ab-testing';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	try {
		const { publicId } = await context.params;
		const form = await prisma.form.findUnique({
			where: { publicId },
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

		// Check if form is public (defaults to true for backwards compatibility)
		const formSettings = form.settings as { isPublic?: boolean } | null;
		const isPublic = formSettings?.isPublic ?? true;

		const settings = {
			showProgressBar: true,
			showStepNumbers: true,
		};

		// Include Turnstile site key if configured
		const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

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
		});
	} catch (err) {
		console.error('Error fetching form:', err);
		return api.internalError('Failed to load form');
	}
}


