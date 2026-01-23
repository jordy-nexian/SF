import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema for allowed tenant settings (prevents schema pollution)
const tenantSettingsSchema = z.object({
	theme: z.object({
		primaryColor: z.string().optional(),
		backgroundColor: z.string().optional(),
		fontFamily: z.string().optional(),
	}).optional(),
	branding: z.object({
		logoUrl: z.string().url().optional(),
		companyName: z.string().max(100).optional(),
	}).optional(),
	notifications: z.object({
		emailOnSubmission: z.boolean().optional(),
		webhookFailureAlerts: z.boolean().optional(),
	}).optional(),
}).strict(); // strict() rejects unknown keys

export async function GET(_req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			id: true,
			name: true,
			plan: true,
			defaultN8nWebhookUrl: true,
			settings: true,
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	// Only owners and admins can update settings
	if (session.role === "viewer") {
		return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
	}

	const body = await req.json().catch(() => ({}));

	// Validate settings schema to prevent pollution
	const parsed = tenantSettingsSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid settings format", details: parsed.error.format() },
			{ status: 400 }
		);
	}

	// Get current settings
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: { settings: true },
	});

	// Merge validated settings with existing
	const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
	const newSettings = {
		...currentSettings,
		...parsed.data,
	};

	// Update tenant
	await prisma.tenant.update({
		where: { id: session.tenantId },
		data: { settings: newSettings },
	});

	return NextResponse.json({ success: true });
}












