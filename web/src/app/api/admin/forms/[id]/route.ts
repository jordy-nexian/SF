import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession } from "@/lib/auth-helpers";
import { z } from "zod";
import * as api from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return api.unauthorized();
	const { id } = await context.params;
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		include: {
			currentVersion: true,
			versions: { orderBy: { versionNumber: "desc" } },
		},
	});
	if (!form) return api.notFound("Form not found");
	return api.success({
		id: form.id,
		name: form.name,
		publicId: form.publicId,
		status: form.status,
		currentVersionId: form.currentVersionId,
		primaryN8nWebhookUrl: form.primaryN8nWebhookUrl,
		backupWebhookUrl: form.backupWebhookUrl,
		thankYouUrl: form.thankYouUrl,
		thankYouMessage: form.thankYouMessage,
		settings: form.settings,
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
	primaryN8nWebhookUrl: z.string().url().nullable().optional(),
	backupWebhookUrl: z.string().url().nullable().optional(),
	thankYouUrl: z.string().url().nullable().optional(),
	thankYouMessage: z.string().nullable().optional(),
	settings: z.any().optional(),
});

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return api.unauthorized();
	const { id } = await context.params;
	const body = await req.json().catch(() => ({}));
	const parsed = updateSchema.safeParse(body);
	if (!parsed.success) {
		return api.validationError("Invalid form data", parsed.error.issues);
	}

	// Ensure the form belongs to tenant
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		select: { id: true, status: true },
	});
	if (!form) return api.notFound("Form not found");

	// If setting currentVersionId, ensure it belongs to this form
	let currentVersionData: { currentVersionId?: string } = {};
	if (parsed.data.currentVersionId) {
		const version = await prisma.formVersion.findFirst({
			where: { id: parsed.data.currentVersionId, formId: id },
			select: { id: true },
		});
		if (!version) return api.notFound("Version not found");
		currentVersionData.currentVersionId = version.id;
	}

	// Build update data, only including fields that were provided
	const updateData: Record<string, unknown> = { ...currentVersionData };
	if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
	if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
	if (parsed.data.primaryN8nWebhookUrl !== undefined) updateData.primaryN8nWebhookUrl = parsed.data.primaryN8nWebhookUrl;
	if (parsed.data.backupWebhookUrl !== undefined) updateData.backupWebhookUrl = parsed.data.backupWebhookUrl;
	if (parsed.data.thankYouUrl !== undefined) updateData.thankYouUrl = parsed.data.thankYouUrl;
	if (parsed.data.thankYouMessage !== undefined) updateData.thankYouMessage = parsed.data.thankYouMessage;
	if (parsed.data.settings !== undefined) updateData.settings = parsed.data.settings;

	const updated = await prisma.form.update({
		where: { id },
		data: updateData,
		select: { id: true },
	});

	// Log status changes
	if (parsed.data.status && parsed.data.status !== form.status) {
		try {
			await prisma.$executeRaw`
				INSERT INTO "AuditLog" ("id", "tenantId", "userId", "action", "resourceType", "resourceId", "metadata", "createdAt")
				VALUES (${`audit_${Date.now()}`}, ${session.tenantId}, ${session.userId}, ${`form.status.${parsed.data.status}`}, 'form', ${id}, ${JSON.stringify({ oldStatus: form.status, newStatus: parsed.data.status })}, NOW())
			`;
		} catch {
			// Audit log failure shouldn't break the operation
		}
	}

	return api.success({ id: updated.id });
}

export async function DELETE(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	try {
		const session = await requireTenantSession();
		if (!session) return api.unauthorized();
		const { id } = await context.params;

		// Ensure the form belongs to tenant
		const form = await prisma.form.findFirst({
			where: { id, tenantId: session.tenantId },
			select: { id: true, name: true },
		});
		if (!form) return api.notFound("Form not found");

		// Delete the form (cascade will handle versions and submission events)
		await prisma.form.delete({
			where: { id },
		});

		// Log the deletion
		try {
			await prisma.$executeRaw`
				INSERT INTO "AuditLog" ("id", "tenantId", "userId", "action", "resourceType", "resourceId", "metadata", "createdAt")
				VALUES (${`audit_${Date.now()}`}, ${session.tenantId}, ${session.userId}, 'form.deleted', 'form', ${id}, ${JSON.stringify({ name: form.name })}, NOW())
			`;
		} catch {
			// Audit log failure shouldn't break the operation
		}

		return api.success({ deleted: true });
	} catch (err) {
		console.error("Error deleting form:", err);
		return api.internalError("Failed to delete form");
	}
}

