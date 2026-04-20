import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession } from "@/lib/auth-helpers";
import { z } from "zod";
import * as api from "@/lib/api-response";
import type { ExtractedToken } from "@/lib/html-template-parser";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

const mappingSchema = z.object({
    tokenId: z.string().min(1),
    payloadKey: z.string().min(1),
    mode: z.enum(["prefill", "prefill_readonly", "manual", "signature"]).optional().default("prefill"),
});

const updateMappingsSchema = z.object({
    mappings: z.array(mappingSchema),
});

/**
 * GET /api/admin/templates/:id/mappings
 * Get current token mappings for a template
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
            },
        });

        if (!template) {
            return api.notFound("Template not found");
        }

        // Combine extracted tokens with their mappings
        const tokens = (template.extractedTokens as unknown as ExtractedToken[]).map(token => {
            const mapping = template.mappings.find((m: { tokenId: string }) => m.tokenId === token.tokenId);
            return {
                tokenId: token.tokenId,
                label: token.label,
                payloadKey: mapping?.payloadKey || null,
                mode: (mapping as any)?.mode || "prefill",
                isMapped: !!mapping,
            };
        });

        return api.success({
            templateId: template.id,
            templateName: template.name,
            tokens,
            mappedCount: template.mappings.length,
            totalCount: (template.extractedTokens as unknown as ExtractedToken[]).length,
        });
    } catch (err) {
        console.error("Error fetching mappings:", err);
        return api.internalError("Failed to fetch mappings");
    }
}

/**
 * PUT /api/admin/templates/:id/mappings
 * Update token-to-payload mappings
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        const { id } = await params;

        // Verify template belongs to tenant
        const template = await prisma.htmlTemplate.findFirst({
            where: {
                id,
                tenantId: session.tenantId,
            },
        });

        if (!template) {
            return api.notFound("Template not found");
        }

        const body = await req.json().catch(() => ({}));
        const parsed = updateMappingsSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError("Invalid mapping data", parsed.error.format());
        }

        const { mappings } = parsed.data;
        const extractedTokens = template.extractedTokens as unknown as ExtractedToken[];

        // Validate that all tokenIds exist in the template
        const validTokenIds = new Set(extractedTokens.map(t => t.tokenId));
        const invalidTokens = mappings.filter(m => !validTokenIds.has(m.tokenId));
        if (invalidTokens.length > 0) {
            return api.validationError("Invalid token IDs", {
                mappings: {
                    _errors: [`Unknown token IDs: ${invalidTokens.map(t => t.tokenId).join(", ")}`],
                },
            });
        }

        // Update mappings in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete existing mappings
            await tx.tokenMapping.deleteMany({
                where: { templateId: id },
            });

            // Create new mappings
            if (mappings.length > 0) {
                await tx.tokenMapping.createMany({
                    data: mappings.map(m => {
                        const token = extractedTokens.find(t => t.tokenId === m.tokenId);
                        return {
                            templateId: id,
                            tokenId: m.tokenId,
                            tokenLabel: token?.label || "",
                            payloadKey: m.payloadKey,
                            mode: m.mode || "prefill",
                        };
                    }),
                });
            }
        });

        return api.success({
            updated: true,
            mappingCount: mappings.length,
        });
    } catch (err) {
        console.error("Error updating mappings:", err);
        return api.internalError("Failed to update mappings");
    }
}
