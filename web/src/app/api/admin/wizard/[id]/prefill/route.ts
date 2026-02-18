/**
 * POST /api/admin/wizard/[id]/prefill
 * Stage 3: Extract prefill-eligible tokens from the pinned template version,
 * send field descriptors + WIP number to n8n, receive populated values.
 *
 * DEV BYPASS: WIP "1111" returns mock values for all prefill tokens.
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';
import { prefillOverridesSchema, canTransition } from '@/lib/wizard-validation';
import { prefillFromWip } from '@/lib/wizard-n8n';
import { logAuditEvent } from '@/lib/audit';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

const DEV_WIP = '1111';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// HTML entity encoding for safe preview rendering
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden();
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = prefillOverridesSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError('Invalid prefill data', parsed.error.format());
        }

        // Fetch wizard run with template and mappings
        const wizardRun = await prisma.wizardRun.findFirst({
            where: { id, tenantId: session.tenantId },
            include: {
                template: {
                    include: {
                        mappings: true,
                    },
                },
                pinnedVersion: {
                    select: { id: true, htmlContent: true },
                },
            },
        });

        if (!wizardRun) {
            return api.notFound('Wizard run not found');
        }

        if (!canTransition(wizardRun.state, 'prefilled')) {
            return api.badRequest(
                `Cannot prefill in state "${wizardRun.state}". Select a template first.`
            );
        }

        if (!wizardRun.template) {
            return api.badRequest('No template selected. Go back to Stage 2.');
        }

        if (!wizardRun.pinnedVersion) {
            return api.badRequest('Pinned version no longer exists. Please re-select the template.');
        }

        // Extract prefill-eligible fields (mode = "prefill")
        const prefillMappings = wizardRun.template.mappings.filter(
            (m: { mode: string }) => m.mode === 'prefill'
        );

        const fields = prefillMappings.map((m: { payloadKey: string; tokenLabel: string; tokenId: string }) => ({
            key: m.payloadKey,
            label: m.tokenLabel,
            tokenId: m.tokenId,
        }));

        let n8nValues: Record<string, string> = {};
        let unmappedTokenIds: string[] = [];
        let prefillSource = 'manual';

        if (wizardRun.wipNumber === DEV_WIP) {
            // --- DEV BYPASS: generate mock values for all prefill fields ---
            console.log('[Wizard] DEV BYPASS active for prefill (WIP "1111")');
            const mockValues: Record<string, string> = {
                'company_name': 'Acme Corporation',
                'client_name': 'Sarah Chen',
                'client_email': 'test@example.com',
                'project_name': 'Demo Project WIP-1111',
                'address': '123 Test Street, London',
                'phone': '+44 7700 900000',
                'date': new Date().toLocaleDateString('en-GB'),
                'amount': '£25,000.00',
                'reference': 'REF-1111-TEST',
                'description': 'Test form prefill via dev bypass',
            };

            for (const field of fields) {
                // Match by payloadKey first, then fill with a sensible default
                n8nValues[field.tokenId] = mockValues[field.key]
                    || `[Test: ${field.label}]`;
            }
            prefillSource = 'dev_bypass';
        } else {
            // --- PRODUCTION: call n8n ---
            const tenant = await prisma.tenant.findUnique({
                where: { id: session.tenantId },
                select: {
                    wipPrefillWebhookUrl: true,
                    sharedSecret: true,
                },
            });

            if (tenant?.wipPrefillWebhookUrl && fields.length > 0) {
                try {
                    const n8nResponse = await prefillFromWip(
                        tenant.wipPrefillWebhookUrl,
                        wizardRun.wipNumber,
                        session.tenantId,
                        tenant.sharedSecret,
                        fields
                    );

                    if (n8nResponse.success && n8nResponse.values) {
                        n8nValues = n8nResponse.values;
                        unmappedTokenIds = n8nResponse.unmapped || [];
                        prefillSource = 'n8n_quickbase';
                    }
                } catch (error) {
                    console.error('[Wizard] Prefill n8n call failed:', error);
                    // Continue with empty prefill — admin can fill manually
                }
            }
        }

        // Apply admin overrides (if any)
        const overrides = parsed.data.overrides || {};

        // Build final prefill data
        const prefillData: Record<string, { key: string; label: string; value: string }> = {};
        for (const mapping of prefillMappings) {
            const value = overrides[mapping.tokenId]
                ?? n8nValues[mapping.tokenId]
                ?? '';
            prefillData[mapping.tokenId] = {
                key: mapping.payloadKey,
                label: mapping.tokenLabel,
                value,
            };
        }

        // Identify non-prefill tokens (manual/signature)
        const nonPrefillTokens = wizardRun.template.mappings
            .filter((m: { mode: string }) => m.mode !== 'prefill')
            .map((m: { tokenId: string; tokenLabel: string; mode: string }) => ({
                tokenId: m.tokenId,
                label: m.tokenLabel,
                mode: m.mode,
                reason: m.mode === 'signature' ? 'signature_field' : 'manual_input',
            }));

        // Build preview HTML by injecting values into tokens
        let htmlPreview = wizardRun.pinnedVersion.htmlContent || '';
        for (const [tokenId, data] of Object.entries(prefillData)) {
            if (data.value) {
                // Replace token spans with escaped values
                const tokenRegex = new RegExp(
                    `(<span[^>]*data-token-id="${tokenId}"[^>]*>)(.*?)(</span>)`,
                    'gi'
                );
                htmlPreview = htmlPreview.replace(
                    tokenRegex,
                    `$1${escapeHtml(data.value)}$3`
                );
            }
        }

        // Update wizard run
        await prisma.wizardRun.update({
            where: { id },
            data: {
                prefillData: prefillData as unknown as object,
                prefillSource,
                state: 'prefilled',
                errorMessage: null,
            },
        });

        // Audit log
        await logAuditEvent({
            tenantId: session.tenantId,
            userId: session.userId,
            action: 'wizard.prefilled',
            resourceType: 'wizard',
            resourceId: id,
            metadata: {
                prefillSource,
                fieldsRequested: fields.length,
                fieldsFilled: Object.values(prefillData).filter((d) => d.value).length,
                unmappedCount: unmappedTokenIds.length,
            },
        });

        return api.success({
            wizardRunId: id,
            state: 'prefilled',
            prefillData,
            unmappedTokens: nonPrefillTokens,
            prefillSource,
            htmlPreview,
        });
    } catch (error) {
        console.error('[Wizard] Prefill error:', error);
        return api.internalError('Failed to prefill form');
    }
}
