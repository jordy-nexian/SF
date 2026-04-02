import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createHmacSignature, buildSignatureHeaders, extractSignatureHeaders, verifyHmacSignature } from '@/lib/hmac';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { validateWebhookUrl } from '@/lib/webhook-validation';
import { validateSubmission } from '@/lib/schema-validation';
import { resolveWebhookUrl, type WebhookRoutingConfig } from '@/lib/webhook-routing';
import { isIpAllowed, type IpAllowlistConfig } from '@/lib/ip-allowlist';
import { transformPayload, type TransformTemplate } from '@/lib/payload-transform';
import { canReceiveSubmission } from '@/lib/usage';
import { verifyTurnstileToken, isTurnstileEnabled } from '@/lib/captcha';
import { createRequestLogger, generateRequestId, logSubmissionEvent, logWebhookEvent, logRateLimitEvent } from '@/lib/logger';
import { verifyTenantToken } from '@/lib/tenant-token';
import { getPortalSessionFromCookies } from '@/lib/portal-auth';
import type { PlanId } from '@/lib/plans';
import type { FormSchema } from '@/types/form-schema';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const DEFAULT_MAX_BYTES = 262144; // 256 KiB
const DEFAULT_MAX_FIELDS = 500;
const FORWARD_TIMEOUT_MS = 10000;

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	const start = Date.now();
	let submissionId = crypto.randomUUID();
	const requestId = generateRequestId();
	const { publicId } = await context.params;

	// Create request-scoped logger
	const logger = createRequestLogger(requestId, `/api/forms/${publicId}/submit`);

	logger.debug({ submissionId, publicId }, 'Submission received');

	// Rate limiting by IP (distributed via Upstash Redis)
	const clientIp = getClientIp(request.headers);
	const rateLimitKey = `submit:${clientIp}`;
	const rl = await rateLimit(rateLimitKey, RATE_LIMITS.submit);
	if (!rl.success) {
		logRateLimitEvent(logger, {
			key: rateLimitKey,
			limit: rl.limit,
			remaining: rl.remaining,
			blocked: true,
		});
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Too many requests. Please try again later.',
			},
			{
				status: 429,
				headers: {
					'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString(),
					'X-RateLimit-Limit': rl.limit.toString(),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': Math.ceil(rl.resetAt / 1000).toString(),
				},
			}
		);
	}

	// Enforce payload size by reading raw text first
	const raw = await request.text();
	const maxBytes =
		Number(process.env.SUBMISSION_MAX_BYTES) || DEFAULT_MAX_BYTES;
	if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Payload too large',
			},
			{ status: 413 }
		);
	}

	// Parse JSON from raw string
	let body: any;
	try {
		body = JSON.parse(raw);
	} catch {
		return NextResponse.json(
			{ status: 'error', submissionId, message: 'Invalid JSON' },
			{ status: 400 }
		);
	}

	const { formId, formVersion, answers, meta, turnstileToken, prefillData } = body ?? {};
	if (!formId || typeof formId !== 'string' || answers == null) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Missing required fields',
			},
			{ status: 400 }
		);
	}

	// Verify Turnstile CAPTCHA if enabled
	if (isTurnstileEnabled()) {
		const turnstileResult = await verifyTurnstileToken(
			turnstileToken as string,
			clientIp
		);

		if (!turnstileResult.success) {
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'Verification failed. Please try again.',
					code: 'CAPTCHA_FAILED',
				},
				{ status: 403 }
			);
		}
	}

	// Optional: field count soft limit
	try {
		const fieldCount =
			answers && typeof answers === 'object'
				? Object.keys(answers).length
				: 0;
		const maxFields =
			Number(process.env.SUBMISSION_MAX_FIELDS) || DEFAULT_MAX_FIELDS;
		if (fieldCount > maxFields) {
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'Too many fields',
				},
				{ status: 400 }
			);
		}
	} catch {
		// ignore field count errors
	}

	// Lookup form and tenant
	const form = await prisma.form.findUnique({
		where: { publicId },
		include: {
			tenant: true,
			currentVersion: true,
		},
	});
	if (!form || form.status !== 'live') {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Form not available',
			},
			{ status: 404 }
		);
	}
	const tenant = form.tenant;

	// Check IP allowlist/blocklist
	const formSettings = form.settings as { ipAllowlist?: IpAllowlistConfig; requireTenantToken?: boolean; isPublic?: boolean } | null;
	const ipAllowlistConfig = formSettings?.ipAllowlist;
	const ipCheck = isIpAllowed(clientIp, ipAllowlistConfig);
	if (!ipCheck.allowed) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Submission not allowed from this location',
			},
			{ status: 403 }
		);
	}

	// Authorization: Tenant token OR Portal session for private forms
	// Token contains: { publicId, customerId, exp } signed with tenant.sharedSecret
	let customerId: string | undefined;
	let endCustomerId: string | undefined;
	const tenantToken = (meta as Record<string, unknown>)?.tenantToken as string | undefined;
	const requireTenantToken = formSettings?.requireTenantToken === true;
	const isPublic = formSettings?.isPublic ?? true;

	if (tenantToken) {
		// Validate the tenant token
		const tokenResult = verifyTenantToken(tenantToken, tenant.sharedSecret, publicId);
		if (!tokenResult.valid) {
			const errorMessages: Record<string, string> = {
				'INVALID_FORMAT': 'Invalid token format',
				'INVALID_SIGNATURE': 'Token signature verification failed',
				'EXPIRED': 'Token has expired',
				'PUBLIC_ID_MISMATCH': 'Token is not valid for this form',
			};
			logger.warn({ error: tokenResult.error }, 'Tenant token validation failed');
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: errorMessages[tokenResult.error || ''] || 'Token validation failed',
					code: 'TOKEN_INVALID',
				},
				{ status: 403 }
			);
		}
		customerId = tokenResult.payload?.customerId;
		logger.debug({ customerId }, 'Tenant token validated');
	} else if (!isPublic) {
		// Private form without token - check portal session
		const portalSession = await getPortalSessionFromCookies(request.cookies);

		if (!portalSession) {
			if (requireTenantToken) {
				return NextResponse.json(
					{
						status: 'error',
						submissionId,
						message: 'This form requires a valid access token',
						code: 'TOKEN_REQUIRED',
					},
					{ status: 401 }
				);
			}
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'Authentication required',
					code: 'AUTH_REQUIRED',
				},
				{ status: 401 }
			);
		}

		// Verify portal session is for this tenant
		if (portalSession.tenantId !== form.tenantId) {
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'You do not have access to this form',
				},
				{ status: 403 }
			);
		}

		// Verify user is assigned to this form
		const assignment = await prisma.formAssignment.findFirst({
			where: {
				formId: form.id,
				endCustomerId: portalSession.endCustomerId,
			},
		});

		if (!assignment) {
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'This form has not been assigned to you',
				},
				{ status: 403 }
			);
		}

		endCustomerId = portalSession.endCustomerId;
		logger.debug({ endCustomerId }, 'Portal session validated');
	} else if (requireTenantToken) {
		// Public form but token is explicitly required
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'This form requires a valid access token',
				code: 'TOKEN_REQUIRED',
			},
			{ status: 400 }
		);
	}

	// Check submission limit
	const plan = (tenant.plan || 'free') as PlanId;
	const submissionCheck = await canReceiveSubmission(tenant.id, plan);
	if (!submissionCheck.allowed) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'This form has reached its monthly submission limit. Please contact the form owner.',
				code: 'SUBMISSION_LIMIT_EXCEEDED',
			},
			{ status: 429 }
		);
	}

	const defaultWebhookUrl = form.primaryN8nWebhookUrl ?? tenant.defaultN8nWebhookUrl;
	if (!defaultWebhookUrl) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'No webhook configured',
			},
			{ status: 500 }
		);
	}

	// Resolve webhook URL using conditional routing
	const routingConfig = form.webhookRouting as WebhookRoutingConfig | null;
	const { url: webhookUrl, ruleName: matchedRule } = resolveWebhookUrl(
		routingConfig,
		answers as Record<string, unknown>,
		defaultWebhookUrl
	);

	// Validate webhook URL for SSRF protection
	const webhookValidation = validateWebhookUrl(webhookUrl);
	if (!webhookValidation.valid) {
		// Mask URL in logs - show domain only for debugging without exposing full path
		const maskedUrl = (() => { try { return new URL(webhookUrl).hostname; } catch { return '[invalid]'; } })();
		console.error(`Invalid webhook URL for form ${form.id} (${maskedUrl}): ${webhookValidation.error}`);
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'Form configuration error',
			},
			{ status: 500 }
		);
	}

	// Resolve effective version and get schema for validation
	let effectiveVersion = form.currentVersion?.versionNumber;
	let schema: FormSchema | null = form.currentVersion?.schema as FormSchema | null;
	if (!effectiveVersion || !schema) {
		const latest = await prisma.formVersion.findFirst({
			where: { formId: form.id },
			orderBy: { versionNumber: 'desc' },
			select: { versionNumber: true, schema: true },
		});
		effectiveVersion = latest?.versionNumber ?? 1;
		schema = latest?.schema as FormSchema | null;
	}

	// Server-side schema validation (skip for HTML template forms which use token IDs not in schema)
	const isHtmlTemplate = (meta as Record<string, unknown>)?.htmlTemplate === true;
	if (schema && answers && typeof answers === 'object' && !isHtmlTemplate) {
		const validation = validateSubmission(schema, answers as Record<string, unknown>);
		if (!validation.valid) {
			// Build detailed error message
			const errorDetails = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: `Validation failed: ${errorDetails}`,
					errors: validation.errors,
				},
				{ status: 400 }
			);
		}
	}

	// Construct payload for n8n (do not log or persist answers)
	submissionId = submissionId || crypto.randomUUID();
	const submittedAt = new Date().toISOString();
	const client = {
		ip: clientIp,
		userAgent: request.headers.get('user-agent') || undefined,
	};

	// Resolve htmlContent from the effective version
	// Note: htmlContent is on FormVersion but types may be stale - using assertion
	const currentVersionData = form.currentVersion as { htmlContent?: string | null } | null;
	let htmlContent: string | null = currentVersionData?.htmlContent ?? null;
	if (!htmlContent && !form.currentVersion) {
		// If no currentVersion, fetch latest version for htmlContent
		const versionWithHtml = await prisma.formVersion.findFirst({
			where: { formId: form.id },
			orderBy: { versionNumber: 'desc' },
		});
		htmlContent = (versionWithHtml as { htmlContent?: string | null } | null)?.htmlContent ?? null;
	}

	// Build base payload (htmlContent and prefillData included for webhook/transforms)
	// Inject customerId and/or endCustomerId into meta if validated
	// Expand compact customerContext from prefill token into readable fields for n8n
	// Pass through wipContext (WIP document metadata) if present
	const rawMeta = (meta as Record<string, unknown>) || {};
	const ctxCustomer = rawMeta.customerContext as { e?: string; n?: string; w?: string } | undefined;
	const ctxWipContext = rawMeta.wipContext as Record<string, unknown> | undefined;
	const enrichedMeta: Record<string, unknown> = {
		...rawMeta,
		...(customerId ? { customerId } : {}),
		...(endCustomerId ? { endCustomerId } : {}),
		...(ctxCustomer ? {
			customerEmail: ctxCustomer.e,
			customerName: ctxCustomer.n,
			wipNumber: ctxCustomer.w,
		} : {}),
		...(ctxWipContext ? { wipContext: ctxWipContext } : {}),
	};
	// Remove compact customerContext — expanded fields above replace it
	delete enrichedMeta.customerContext;

	const basePayload = {
		tenantId: tenant.id,
		formId: form.id,
		formVersion: Number.isInteger(formVersion) ? formVersion : effectiveVersion,
		submissionId,
		submittedAt,
		answers,
		client,
		meta: enrichedMeta,
		htmlContent,
		prefillData: prefillData || null,
	};

	// Apply payload transformation if configured
	const payloadTransform = form.payloadTransform as TransformTemplate | null;
	const finalPayload = transformPayload(basePayload, payloadTransform);
	const forwardPayload = JSON.stringify(finalPayload);

	// HMAC signature
	const h = createHmacSignature(forwardPayload, tenant.sharedSecret);

	// Capture values for use in nested function (avoid closure issues with nullable types)
	const formIdForHeaders = form.id;
	const tenantIdForHeaders = tenant.id;

	// Helper to send webhook
	async function sendWebhook(url: string): Promise<{ status?: number; success: boolean; hmacError?: string }> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
		try {
			const res = await fetch(url, {
				method: 'POST',
				body: forwardPayload,
				headers: {
					'content-type': 'application/json',
					...buildSignatureHeaders(h),
					'X-Submission-Id': submissionId,
					'X-Tenant-Id': tenantIdForHeaders,
					'X-Form-Id': formIdForHeaders,
				},
				signal: controller.signal,
			});

			if (!res.ok) {
				return { status: res.status, success: false };
			}

			// Verify inbound HMAC signature on response
			const rawBody = await res.text();
			const sigHeaders = extractSignatureHeaders(res);
			if (!sigHeaders) {
				logger.error({ url: '[masked]' }, 'HMAC mismatch: missing signature headers on webhook response');
				return { status: res.status, success: false, hmacError: 'HMAC mismatch: missing signature headers' };
			}
			const verification = verifyHmacSignature(rawBody, sigHeaders, tenant.sharedSecret);
			if (!verification.valid) {
				logger.error({ url: '[masked]', error: verification.error }, 'Webhook response HMAC verification failed');
				return { status: res.status, success: false, hmacError: verification.error };
			}

			return { status: res.status, success: true };
		} catch {
			return { status: undefined, success: false };
		} finally {
			clearTimeout(timeout);
		}
	}

	// Forward to primary webhook
	logWebhookEvent(logger, {
		type: 'sending',
		webhookUrl,
		formId: form.id,
	});

	const webhookStart = Date.now();
	let { status, success } = await sendWebhook(webhookUrl);
	const webhookDuration = Date.now() - webhookStart;

	if (success) {
		logWebhookEvent(logger, {
			type: 'success',
			webhookUrl,
			formId: form.id,
			status,
			duration: webhookDuration,
		});
	} else {
		logWebhookEvent(logger, {
			type: 'failed',
			webhookUrl,
			formId: form.id,
			status,
			duration: webhookDuration,
			error: status ? `HTTP ${status}` : 'Connection failed',
		});
	}

	// Try backup webhook on failure
	const backupUrl = form.backupWebhookUrl;
	if (!success && backupUrl) {
		const backupValidation = validateWebhookUrl(backupUrl);
		if (backupValidation.valid) {
			logger.info({ backupUrl: '[masked]' }, 'Trying backup webhook');
			const backup = await sendWebhook(backupUrl);
			status = backup.status;
			success = backup.success;

			if (success) {
				logWebhookEvent(logger, {
					type: 'success',
					webhookUrl: backupUrl,
					formId: form.id,
					status,
				});
			}
		}
	}

	// Record metadata only (no answers)
	const durationMs = Date.now() - start;
	try {
		await prisma.submissionEvent.create({
			data: {
				tenantId: tenant.id,
				formId: form.id,
				formVersion: Number.isInteger(formVersion) ? formVersion : effectiveVersion,
				submissionId,
				status: success ? 'success' : 'error',
				httpCode: status,
				durationMs,
				submittedAt: new Date(submittedAt),
				payloadSizeBytes: Buffer.byteLength(raw, 'utf8'),
				fieldCount:
					answers && typeof answers === 'object'
						? Object.keys(answers).length
						: 0,
			},
		});

		logSubmissionEvent(logger, {
			type: success ? 'relayed' : 'failed',
			formId: form.id,
			tenantId: tenant.id,
			webhookStatus: status,
			duration: durationMs,
			error: success ? undefined : 'Webhook delivery failed',
		});

		// Mark form assignment as completed if endCustomerId was server-validated
		if (success && endCustomerId) {
			try {
				await prisma.formAssignment.updateMany({
					where: {
						endCustomerId: endCustomerId,
						formId: form.id,
						status: { not: 'completed' },
					},
					data: {
						status: 'completed',
						completedAt: new Date(),
					},
				});
				logger.debug({ endCustomerId: meta.endCustomerId, formId: form.id }, 'Assignment marked as completed');
			} catch (assignmentErr) {
				logger.error({ error: assignmentErr instanceof Error ? assignmentErr.message : 'Unknown' }, 'Failed to update assignment status');
			}
		}
	} catch (err) {
		// Log metadata only, no PII/answers
		logger.error(
			{
				formId: form.id,
				tenantId: tenant.id,
				error: err instanceof Error ? err.message : 'Unknown error',
			},
			'Failed to record submission event'
		);
	}

	if (success) {
		return NextResponse.json({ status: 'ok', submissionId });
	}
	return NextResponse.json(
		{
			status: 'error',
			submissionId,
			message: 'We couldn’t submit your form. Please try again.',
		},
		{ status: 502 }
	);
}


