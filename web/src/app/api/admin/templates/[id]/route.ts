import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession } from "@/lib/auth-helpers";
import * as api from "@/lib/api-response";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/templates/:id
 * Get template details with tokens and mappings
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        const { id } = await params;

        const template = await prisma.htmlTemplate.findFirst({
            where: {
                id,
                tenantId: session.tenantId,
            },
            include: {
                mappings: true,
                _count: {
                    select: { forms: true },
                },
            },
        });

        if (!template) {
            return api.notFound("Template not found");
        }

        return api.success({
            id: template.id,
            name: template.name,
            htmlContent: template.htmlContent,
            extractedTokens: template.extractedTokens,
            mappings: template.mappings,
            formCount: template._count.forms,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
        });
    } catch (err) {
        console.error("Error fetching template:", err);
        return api.internalError("Failed to fetch template");
    }
}

/**
 * DELETE /api/admin/templates/:id
 * Delete a template (only if not used by any forms)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        const { id } = await params;

        const template = await prisma.htmlTemplate.findFirst({
            where: {
                id,
                tenantId: session.tenantId,
            },
            include: {
                _count: {
                    select: { forms: true },
                },
            },
        });

        if (!template) {
            return api.notFound("Template not found");
        }

        if (template._count.forms > 0) {
            return api.conflict(
                `Cannot delete template. It is currently used by ${template._count.forms} form(s).`
            );
        }

        await prisma.htmlTemplate.delete({
            where: { id },
        });

        return api.success({ deleted: true });
    } catch (err) {
        console.error("Error deleting template:", err);
        return api.internalError("Failed to delete template");
    }
}
