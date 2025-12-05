import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
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
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	return NextResponse.json(tenant);
}

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	defaultN8nWebhookUrl: z.string().url().nullable().optional(),
});

// PUT update tenant settings
export async function PUT(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

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

	const updated = await prisma.tenant.update({
		where: { id: session.tenantId },
		data: updateData,
		select: {
			id: true,
			name: true,
			defaultN8nWebhookUrl: true,
		},
	});

	return NextResponse.json(updated);
}






