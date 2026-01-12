import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { createHmacSignature, buildSignatureHeaders } from "@/lib/hmac";
import { validateWebhookUrl } from "@/lib/webhook-validation";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const TEST_TIMEOUT_MS = 10000;

export async function POST(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const { id } = await context.params;

	// Get form with tenant
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		include: { tenant: true },
	});

	if (!form) {
		return NextResponse.json({ error: "Form not found" }, { status: 404 });
	}

	const webhookUrl = form.primaryN8nWebhookUrl ?? form.tenant.defaultN8nWebhookUrl;
	if (!webhookUrl) {
		return NextResponse.json(
			{ error: "No webhook URL configured" },
			{ status: 400 }
		);
	}

	// Validate webhook URL
	const validation = validateWebhookUrl(webhookUrl);
	if (!validation.valid) {
		return NextResponse.json(
			{ error: `Invalid webhook URL: ${validation.error}` },
			{ status: 400 }
		);
	}

	// Create test payload
	const testSubmissionId = `test-${crypto.randomUUID()}`;
	const testPayload = JSON.stringify({
		tenantId: form.tenant.id,
		formId: form.id,
		formVersion: 0,
		submissionId: testSubmissionId,
		submittedAt: new Date().toISOString(),
		answers: {
			_test: true,
			_message: "This is a test submission from the admin panel.",
		},
		client: {
			ip: "test",
			userAgent: "StatelessForms/AdminTest",
		},
		meta: {
			isTest: true,
		},
	});

	// Sign the payload
	const sig = createHmacSignature(testPayload, form.tenant.sharedSecret);

	// Send test request
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

	try {
		const start = Date.now();
		const res = await fetch(webhookUrl, {
			method: "POST",
			body: testPayload,
			headers: {
				"Content-Type": "application/json",
				...buildSignatureHeaders(sig),
				"X-Submission-Id": testSubmissionId,
				"X-Tenant-Id": form.tenant.id,
				"X-Form-Id": form.id,
			},
			signal: controller.signal,
		});
		const durationMs = Date.now() - start;

		const responseText = await res.text().catch(() => "");

		return NextResponse.json({
			success: res.ok,
			status: res.status,
			statusText: res.statusText,
			durationMs,
			response: responseText.slice(0, 500), // Limit response size
		});
	} catch (err: unknown) {
		const errorMessage = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json(
			{
				success: false,
				error: errorMessage.includes("abort")
					? "Request timed out"
					: errorMessage,
			},
			{ status: 500 }
		);
	} finally {
		clearTimeout(timeout);
	}
}












