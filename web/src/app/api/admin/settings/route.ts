import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

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

	// Get current settings
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: { settings: true },
	});

	// Merge new settings with existing
	const currentSettings = (tenant?.settings as Record<string, unknown>) || {};
	const newSettings = {
		...currentSettings,
		...body,
	};

	// Update tenant
	await prisma.tenant.update({
		where: { id: session.tenantId },
		data: { settings: newSettings },
	});

	return NextResponse.json({ success: true });
}






