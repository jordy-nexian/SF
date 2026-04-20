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

        // Extract prefill-eligible fields (mode = "prefill" or "prefill_readonly")
        const prefillMappings = wizardRun.template.mappings.filter(
            (m: { mode: string }) => m.mode === 'prefill' || m.mode === 'prefill_readonly'
        );

        const fields = prefillMappings.map((m: { payloadKey: string; tokenLabel: string; tokenId: string }) => ({
            key: m.payloadKey,
            label: m.tokenLabel,
            tokenId: m.tokenId,
        }));

        let n8nValues: Record<string, string> = {};
        let unmappedTokenIds: string[] = [];
        let prefillSource = 'manual';
        let prefillWarning: string | null = null;

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
                    } else {
                        const reason = n8nResponse.error || 'n8n returned success=false with no values';
                        console.warn('[Wizard] Prefill n8n response unsuccessful:', reason);
                        prefillWarning = `n8n prefill returned no data: ${reason}`;
                        prefillSource = 'n8n_failed';
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('[Wizard] Prefill n8n call failed:', errorMessage);
                    console.error('[Wizard] Prefill error details:', {
                        webhookUrl: tenant.wipPrefillWebhookUrl,
                        wipNumber: wizardRun.wipNumber,
                        tenantId: session.tenantId,
                        fieldsCount: fields.length,
                        errorType: error instanceof Error ? error.constructor.name : typeof error,
                        stack: error instanceof Error ? error.stack : undefined,
                    });
                    prefillWarning = `n8n prefill failed: ${errorMessage}`;
                    prefillSource = 'n8n_failed';
                    // Continue with empty prefill — admin can fill manually
                }
            } else if (!tenant?.wipPrefillWebhookUrl) {
                prefillWarning = 'No prefill webhook URL configured for this tenant';
                console.warn('[Wizard] No wipPrefillWebhookUrl set for tenant:', session.tenantId);
            } else if (fields.length === 0) {
                prefillWarning = 'No prefill-eligible fields found in template mappings';
                console.warn('[Wizard] No prefill fields for wizard run:', id);
            }
        }

        // Apply admin overrides (if any)
        const overrides = parsed.data.overrides || {};

        // Build final prefill data — include ALL editable tokens (prefill + manual)
        const prefillData: Record<string, { key: string; label: string; value: string; source: string }> = {};

        // Prefill-mode tokens (auto-populated from Quickbase)
        for (const mapping of prefillMappings) {
            const isReadOnly = mapping.mode === 'prefill_readonly';
            // Read-only tokens ignore admin overrides — value is locked to QB data
            const value = isReadOnly
                ? (n8nValues[mapping.tokenId] ?? '')
                : (overrides[mapping.tokenId] ?? n8nValues[mapping.tokenId] ?? '');
            prefillData[mapping.tokenId] = {
                key: mapping.payloadKey,
                label: mapping.tokenLabel,
                value,
                source: isReadOnly ? 'quickbase_readonly' : 'quickbase',
            };
        }

        // Manual-mode tokens (admin-editable, not from Quickbase)
        const manualMappings = wizardRun.template.mappings
            .filter((m: { mode: string }) => m.mode === 'manual');
        for (const mapping of manualMappings) {
            const value = overrides[mapping.tokenId] ?? '';
            prefillData[mapping.tokenId] = {
                key: mapping.payloadKey,
                label: mapping.tokenLabel,
                value,
                source: 'admin',
            };
        }

        // Signature tokens remain non-editable (fund coordinator must sign)
        const signatureTokens = wizardRun.template.mappings
            .filter((m: { mode: string }) => m.mode === 'signature')
            .map((m: { tokenId: string; tokenLabel: string; mode: string }) => ({
                tokenId: m.tokenId,
                label: m.tokenLabel,
                mode: m.mode,
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
            signatureTokens,
            prefillSource,
            prefillWarning,
            htmlPreview,
        });
    } catch (error) {
        console.error('[Wizard] Prefill error:', error);
        return api.internalError('Failed to prefill form');
    }
}
