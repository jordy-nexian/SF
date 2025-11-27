import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const { id } = await context.params;
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		include: {
			currentVersion: true,
			versions: { orderBy: { versionNumber: "desc" } },
		},
	});
	if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
	return NextResponse.json({
		id: form.id,
		name: form.name,
		publicId: form.publicId,
		status: form.status,
		currentVersionId: form.currentVersionId,
		versions: form.versions.map((v) => ({
			id: v.id,
			versionNumber: v.versionNumber,
			createdAt: v.createdAt,
		})),
	});
}

const updateSchema = z.object({
	name: z.string().min(1).optional(),
	status: z.enum(["draft", "live", "archived"]).optional(),
	currentVersionId: z.string().optional(),
});

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const { id } = await context.params;
	const body = await req.json().catch(() => ({}));
	const parsed = updateSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	// Ensure the form belongs to tenant
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		select: { id: true },
	});
	if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

	// If setting currentVersionId, ensure it belongs to this form
	let currentVersionData: { currentVersionId?: string } = {};
	if (parsed.data.currentVersionId) {
		const version = await prisma.formVersion.findFirst({
			where: { id: parsed.data.currentVersionId, formId: id },
			select: { id: true },
		});
		if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
		currentVersionData.currentVersionId = version.id;
	}

	const updated = await prisma.form.update({
		where: { id },
		data: {
			name: parsed.data.name,
			status: parsed.data.status,
			...currentVersionData,
		},
		select: { id: true },
	});
	return NextResponse.json({ id: updated.id });
}


