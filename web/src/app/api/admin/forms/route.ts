import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession } from "@/lib/auth-helpers";
import { z } from "zod";
import { canCreateForm } from "@/lib/usage";
import type { PlanId } from "@/lib/plans";
import * as api from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
	try {
		const session = await requireTenantSession();
		if (!session) return api.unauthorized();

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

		return api.success({ forms });
	} catch (err) {
		console.error("Error fetching forms:", err);
		return api.internalError("Failed to fetch forms");
	}
}

const createFormSchema = z.object({
	name: z.string().min(1),
	publicId: z.string().regex(/^[a-z0-9-]+$/),
	schema: z.any().optional(),
	templateId: z.string().optional(),
	htmlContent: z.string().optional(),
});

export async function POST(req: NextRequest) {
	try {
		const session = await requireTenantSession();
		if (!session) return api.unauthorized();

		// Get tenant plan
		const tenant = await prisma.tenant.findUnique({
			where: { id: session.tenantId },
			select: { plan: true },
		});
		const plan = (tenant?.plan || 'free') as PlanId;

		// Check form limit
		const limitCheck = await canCreateForm(session.tenantId, plan);
		if (!limitCheck.allowed) {
			return api.usageLimitExceeded(
				`You've reached your limit of ${limitCheck.limit} forms. Please upgrade your plan to create more.`
			);
		}

		const body = await req.json().catch(() => ({}));
		const parsed = createFormSchema.safeParse(body);
		if (!parsed.success) {
			return api.validationError("Invalid form data", parsed.error.format());
		}
		const { name, publicId, schema, templateId, htmlContent } = parsed.data;

		// If templateId provided but no htmlContent, fetch from template
		let initialHtml = htmlContent;
		if (templateId && !initialHtml) {
			const template = await prisma.htmlTemplate.findUnique({
				where: { id: templateId },
				select: { htmlContent: true },
			});
			if (template) {
				initialHtml = template.htmlContent;
			}
		}

		// Check for duplicate publicId
		const existing = await prisma.form.findFirst({
			where: { tenantId: session.tenantId, publicId },
		});
		if (existing) {
			return api.conflict(
				`A form with public ID "${publicId}" already exists. Please choose a different ID.`
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
					templateId: templateId || null,
					// New forms default to requiring authentication
					settings: { isPublic: false },
				},
			});
			if (schema) {
				const ver = await tx.formVersion.create({
					data: {
						formId: form.id,
						versionNumber: 1,
						schema,
						htmlContent: initialHtml,
					},
				});
				await tx.form.update({
					where: { id: form.id },
					data: { currentVersionId: ver.id },
				});
			}
			return form;
		});

		return api.success({ formId: created.id }, 201);
	} catch (err) {
		console.error("Error creating form:", err);
		return api.internalError("Failed to create form");
	}
}




