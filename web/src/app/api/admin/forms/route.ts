import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const forms = await prisma.form.findMany({
		where: { tenantId: session.tenantId },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			name: true,
			publicId: true,
			status: true,
			updatedAt: true,
		},
	});
	return NextResponse.json({ forms });
}

const createFormSchema = z.object({
	name: z.string().min(1),
	publicId: z.string().regex(/^[a-z0-9-]+$/),
	schema: z.any().optional(),
});

export async function POST(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const body = await req.json().catch(() => ({}));
	const parsed = createFormSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}
	const { name, publicId, schema } = parsed.data;

	// Create form + optional initial version
	const created = await prisma.$transaction(async (tx) => {
		const form = await tx.form.create({
			data: {
				tenantId: session.tenantId,
				name,
				publicId,
				status: "draft",
			},
		});
		if (schema) {
			const ver = await tx.formVersion.create({
				data: {
					formId: form.id,
					versionNumber: 1,
					schema,
				},
			});
			await tx.form.update({
				where: { id: form.id },
				data: { currentVersionId: ver.id },
			});
		}
		return form;
	});

	return NextResponse.json({ formId: created.id });
}


