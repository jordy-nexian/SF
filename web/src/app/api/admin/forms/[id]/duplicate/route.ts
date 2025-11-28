import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const duplicateSchema = z.object({
	name: z.string().min(1).optional(),
	publicId: z.string().regex(/^[a-z0-9-]+$/),
});

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const { id } = await context.params;
	const body = await req.json().catch(() => ({}));
	const parsed = duplicateSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Invalid payload", details: parsed.error.issues },
			{ status: 400 }
		);
	}

	// Get the original form with all versions
	const original = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		include: {
			versions: { orderBy: { versionNumber: "asc" } },
		},
	});

	if (!original) {
		return NextResponse.json({ error: "Form not found" }, { status: 404 });
	}

	// Check if publicId is already taken
	const existing = await prisma.form.findUnique({
		where: { publicId: parsed.data.publicId },
		select: { id: true },
	});

	if (existing) {
		return NextResponse.json(
			{ error: "Public ID already exists" },
			{ status: 409 }
		);
	}

	// Create duplicate in a transaction
	const duplicate = await prisma.$transaction(async (tx) => {
		// Create the new form
		const newForm = await tx.form.create({
			data: {
				tenantId: session.tenantId,
				name: parsed.data.name || `${original.name} (Copy)`,
				publicId: parsed.data.publicId,
				status: "draft", // Always start as draft
				primaryN8nWebhookUrl: original.primaryN8nWebhookUrl,
				backupWebhookUrl: original.backupWebhookUrl,
				thankYouUrl: original.thankYouUrl,
				thankYouMessage: original.thankYouMessage,
				settings: original.settings === null ? Prisma.JsonNull : original.settings,
				webhookRouting: original.webhookRouting === null ? Prisma.JsonNull : original.webhookRouting,
				payloadTransform: original.payloadTransform === null ? Prisma.JsonNull : original.payloadTransform,
			},
		});

		// Copy all versions
		let newCurrentVersionId: string | null = null;
		for (const version of original.versions) {
			const newVersion = await tx.formVersion.create({
				data: {
					formId: newForm.id,
					versionNumber: version.versionNumber,
					schema: version.schema,
				},
			});

			// Track which version should be current
			if (original.currentVersionId === version.id) {
				newCurrentVersionId = newVersion.id;
			}
		}

		// Set current version if original had one
		if (newCurrentVersionId) {
			await tx.form.update({
				where: { id: newForm.id },
				data: { currentVersionId: newCurrentVersionId },
			});
		}

		return newForm;
	});

	return NextResponse.json({
		id: duplicate.id,
		publicId: duplicate.publicId,
		name: duplicate.name,
	});
}

