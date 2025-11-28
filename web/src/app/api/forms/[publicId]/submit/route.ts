import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createHmacSignature, buildSignatureHeaders } from '@/lib/hmac';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { validateWebhookUrl } from '@/lib/webhook-validation';
import { validateSubmission } from '@/lib/schema-validation';
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
	const { publicId } = await context.params;

	// Rate limiting by IP
	const clientIp = getClientIp(request.headers);
	const rateLimitKey = `submit:${clientIp}`;
	const rl = rateLimit(rateLimitKey, RATE_LIMITS.submit);
	if (!rl.success) {
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

	const { formId, formVersion, answers, meta } = body ?? {};
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
	const webhookUrl = form.primaryN8nWebhookUrl ?? tenant.defaultN8nWebhookUrl;
	if (!webhookUrl) {
		return NextResponse.json(
			{
				status: 'error',
				submissionId,
				message: 'No webhook configured',
			},
			{ status: 500 }
		);
	}

	// Validate webhook URL for SSRF protection
	const webhookValidation = validateWebhookUrl(webhookUrl);
	if (!webhookValidation.valid) {
		console.error(`Invalid webhook URL for form ${form.id}: ${webhookValidation.error}`);
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

	// Server-side schema validation
	if (schema && answers && typeof answers === 'object') {
		const validation = validateSubmission(schema, answers as Record<string, unknown>);
		if (!validation.valid) {
			return NextResponse.json(
				{
					status: 'error',
					submissionId,
					message: 'Validation failed',
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
	const forwardPayload = JSON.stringify({
		tenantId: tenant.id,
		formId: form.id,
		formVersion: Number.isInteger(formVersion) ? formVersion : effectiveVersion,
		submissionId,
		submittedAt,
		answers,
		client,
		meta,
	});

	// HMAC signature
	const h = createHmacSignature(forwardPayload, tenant.sharedSecret);

	// Forward to n8n
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);
	let status: number | undefined;
	let success = false;
	try {
		const res = await fetch(webhookUrl, {
			method: 'POST',
			body: forwardPayload,
			headers: {
				'content-type': 'application/json',
				...buildSignatureHeaders(h),
				'X-Submission-Id': submissionId,
				'X-Tenant-Id': tenant.id,
				'X-Form-Id': form.id,
			},
			signal: controller.signal,
		});
		status = res.status;
		success = res.ok;
	} catch {
		status = undefined;
		success = false;
	} finally {
		clearTimeout(timeout);
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
	} catch {
		// Intentionally swallow to avoid leaking details; do not log answers
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


