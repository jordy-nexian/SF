import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden, isAdministrator } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

// GET tenant settings
export async function GET() {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			id: true,
			name: true,
			plan: true,
			defaultN8nWebhookUrl: true,
			sharedSecret: true,
			customDomain: true,
			customDomainVerified: true,
			customerWebhookUrl: true,
			wipLookupWebhookUrl: true,
			wipPrefillWebhookUrl: true,
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	// E2.3: Hide sensitive data from non-administrators
	if (!isAdministrator(session.role)) {
		return NextResponse.json({
			id: tenant.id,
			name: tenant.name,
			plan: tenant.plan,
			customDomain: tenant.customDomain,
			customDomainVerified: tenant.customDomainVerified,
			// Deliberately exclude: sharedSecret, defaultN8nWebhookUrl
		});
	}

	return NextResponse.json(tenant);
}

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	defaultN8nWebhookUrl: z.string().url().nullable().optional(),
	customerWebhookUrl: z.string().url().nullable().optional(),
	wipLookupWebhookUrl: z.string().url().nullable().optional(),
	wipPrefillWebhookUrl: z.string().url().nullable().optional(),
});

// PUT update tenant settings
export async function PUT(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	// E2.3: Only administrators can update tenant settings
	if (!isAdministrator(session.role)) {
		return NextResponse.json(
			{ error: "Only administrators can update settings" },
			{ status: 403 }
		);
	}

	const body = await req.json().catch(() => ({}));
	const parsed = updateSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	const updateData: Record<string, unknown> = {};

	if (parsed.data.name !== undefined) {
		updateData.name = parsed.data.name;
	}

	if (parsed.data.defaultN8nWebhookUrl !== undefined) {
		updateData.defaultN8nWebhookUrl = parsed.data.defaultN8nWebhookUrl;
	}

	if (parsed.data.customerWebhookUrl !== undefined) {
		updateData.customerWebhookUrl = parsed.data.customerWebhookUrl;
	}

	if (parsed.data.wipLookupWebhookUrl !== undefined) {
		updateData.wipLookupWebhookUrl = parsed.data.wipLookupWebhookUrl;
	}

	if (parsed.data.wipPrefillWebhookUrl !== undefined) {
		updateData.wipPrefillWebhookUrl = parsed.data.wipPrefillWebhookUrl;
	}

	const updated = await prisma.tenant.update({
		where: { id: session.tenantId },
		data: updateData,
		select: {
			id: true,
			name: true,
			defaultN8nWebhookUrl: true,
			customerWebhookUrl: true,
			wipLookupWebhookUrl: true,
			wipPrefillWebhookUrl: true,
		},
	});

	return NextResponse.json(updated);
}








