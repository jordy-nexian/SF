import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
	try {
		const session = await requireTenantSession();
		if (!session) return forbidden();
		
		console.log("Fetching forms for tenant:", session.tenantId);
		
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
		
		console.log("Found forms:", forms.length);
		return NextResponse.json({ forms });
	} catch (err) {
		console.error("Error fetching forms:", err);
		return NextResponse.json({ forms: [], error: String(err) }, { status: 200 });
	}
}

const createFormSchema = z.object({
	name: z.string().min(1),
	publicId: z.string().regex(/^[a-z0-9-]+$/),
	schema: z.any().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const session = await requireTenantSession();
		if (!session) return forbidden();
		
		const body = await req.json().catch(() => ({}));
		const parsed = createFormSchema.safeParse(body);
		if (!parsed.success) {
			console.error("Form validation failed:", parsed.error.format());
			return NextResponse.json({ error: "Invalid payload", details: parsed.error.format() }, { status: 400 });
		}
		const { name, publicId, schema } = parsed.data;

		// Check for duplicate publicId
		const existing = await prisma.form.findFirst({
			where: { tenantId: session.tenantId, publicId },
		});
		if (existing) {
			return NextResponse.json(
				{ error: `A form with public ID "${publicId}" already exists. Please choose a different ID.` },
				{ status: 400 }
			);
		}

		// Create form + initial version
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
	} catch (err) {
		console.error("Error creating form:", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Failed to create form" },
			{ status: 500 }
		);
	}
}




