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
		select: { id: true },
	});
	if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

	const versions = await prisma.formVersion.findMany({
		where: { formId: id },
		orderBy: { versionNumber: "desc" },
		select: { id: true, versionNumber: true, createdAt: true },
	});
	return NextResponse.json({ versions });
}

const createSchema = z.object({
	schema: z.any(),
	makeCurrent: z.boolean().optional(),
});

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const { id } = await context.params;
	const body = await req.json().catch(() => ({}));
	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}

	// Ensure form belongs to tenant
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		select: { id: true },
	});
	if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });

	// Next version number
	const latest = await prisma.formVersion.findFirst({
		where: { formId: id },
		orderBy: { versionNumber: "desc" },
		select: { versionNumber: true },
	});
	const nextNumber = (latest?.versionNumber ?? 0) + 1;

	const created = await prisma.formVersion.create({
		data: { formId: id, versionNumber: nextNumber, schema: parsed.data.schema },
	});

	if (parsed.data.makeCurrent) {
		await prisma.form.update({ where: { id }, data: { currentVersionId: created.id } });
	}

	return NextResponse.json({ id: created.id, versionNumber: created.versionNumber });
}








