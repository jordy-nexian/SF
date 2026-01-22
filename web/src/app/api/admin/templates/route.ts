import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession } from "@/lib/auth-helpers";
import { z } from "zod";
import * as api from "@/lib/api-response";
import { extractTokensFromHtml } from "@/lib/html-template-parser";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/templates
 * List all HTML templates for the tenant
 */
export async function GET(_req: NextRequest) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        const templates = await prisma.htmlTemplate.findMany({
            where: { tenantId: session.tenantId },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        mappings: true,
                        forms: true,
                    },
                },
            },
        });

        return api.success({ templates });
    } catch (err) {
        console.error("Error fetching templates:", err);
        return api.internalError("Failed to fetch templates");
    }
}

const createTemplateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    htmlContent: z.string().min(1, "HTML content is required"),
});

/**
 * POST /api/admin/templates
 * Upload a new HTML template
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        const body = await req.json().catch(() => ({}));
        const parsed = createTemplateSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError("Invalid template data", parsed.error.format());
        }

        const { name, htmlContent } = parsed.data;

        // Extract tokens from the HTML
        const extractedTokens = extractTokensFromHtml(htmlContent);

        if (extractedTokens.length === 0) {
            return api.validationError(
                "No tokens found in HTML. Templates must contain fe-token spans with data-token-id attributes.",
                { htmlContent: { _errors: ["No fe-token spans found"] } }
            );
        }

        // Create template with extracted tokens
        const template = await prisma.htmlTemplate.create({
            data: {
                tenantId: session.tenantId,
                name,
                htmlContent,
                extractedTokens: extractedTokens,
            },
        });

        return api.success(
            {
                templateId: template.id,
                name: template.name,
                tokenCount: extractedTokens.length,
                tokens: extractedTokens,
            },
            201
        );
    } catch (err) {
        console.error("Error creating template:", err);
        return api.internalError("Failed to create template");
    }
}
