import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import * as api from '@/lib/api-response';
import { validateWebhookUrl } from '@/lib/webhook-validation';
import { verifyPortalSession, PORTAL_SESSION_COOKIE } from '@/lib/portal-auth';
import { prefillFromWip } from '@/lib/wizard-n8n';
import {
    createHmacSignature,
    buildSignatureHeaders,
    extractSignatureHeaders,
    verifyHmacSignature,
} from '@/lib/hmac';

export const dynamic = 'force-dynamic';

/**
 * Prefill API - Fetches data from configured webhook and returns mapped values
 * 
 * Two prefill paths:
 * 1. Portal user with wizard assignment → re-calls n8n with WIP number (no data stored)
 * 2. Public form with prefillWebhookUrl → existing webhook-based prefill
 * 
 * Webhook returns format: [{"label": "...", "value": ...}, ...]
 * 
 * Mapping sources (in priority order):
 * 1. Manual prefillFieldMappings (Form.prefillFieldMappings) - overrides
 * 2. TokenMappings from linked HtmlTemplate - auto from template
 * 3. Direct key match - fallback for flat objects
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ publicId: string }> }
) {
    try {
        const { publicId } = await context.params;

        // Get form with prefill config AND linked template with its mappings
        // (accept either publicId slug OR internal id)
        const form = await prisma.form.findFirst({
            where: { OR: [{ publicId }, { id: publicId }] },
            select: {
                id: true,
                status: true,
                prefillWebhookUrl: true,
                prefillFieldMappings: true,
                tenantId: true,
                template: {
                    select: {
                        id: true,
                        mappings: {
                            select: {
                                tokenId: true,
                                tokenLabel: true,
                                payloadKey: true,
                                mode: true,
                            },
                        },
                    },
                },
            },
        });

        if (!form) {
            return api.notFound('Form not found');
        }

        // Build tokenModes from template mappings (needed regardless of prefill path)
        const tokenModes: Record<string, string> = {};
        if (form.template?.mappings) {
            for (const mapping of form.template.mappings) {
                tokenModes[mapping.tokenId] = mapping.mode || 'prefill';
            }
        }

        // --- Path 1: Portal user with wizard assignment → live n8n prefill ---
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (sessionCookie?.value) {
            const session = await verifyPortalSession(sessionCookie.value);

            if (session) {
                // Look up the FormAssignment → WizardRun chain
                const assignment = await prisma.formAssignment.findFirst({
                    where: {
                        endCustomerId: session.endCustomerId,
                        formId: form.id,
                    },
                    select: {
                        wizardRun: {
                            select: {
                                wipNumber: true,
                                tenantId: true,
                                template: {
                                    select: {
                                        mappings: {
                                            select: {
                                                tokenId: true,
                                                tokenLabel: true,
                                                payloadKey: true,
                                                mode: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                });

                if (assignment?.wizardRun) {
                    const { wizardRun } = assignment;

                    // Get tenant's n8n webhook config
                    const tenant = await prisma.tenant.findUnique({
                        where: { id: wizardRun.tenantId },
                        select: {
                            wipPrefillWebhookUrl: true,
                            sharedSecret: true,
                        },
                    });

                    if (tenant?.wipPrefillWebhookUrl && wizardRun.template?.mappings) {
                        // Build prefill fields from template mappings (same as wizard Stage 3)
                        const prefillMappings = wizardRun.template.mappings.filter(
                            (m: { mode: string }) => m.mode === 'prefill'
                        );

                        const fields = prefillMappings.map(
                            (m: { payloadKey: string; tokenLabel: string; tokenId: string }) => ({
                                key: m.payloadKey,
                                label: m.tokenLabel,
                                tokenId: m.tokenId,
                            })
                        );

                        if (fields.length > 0) {
                            try {
                                const n8nResponse = await prefillFromWip(
                                    tenant.wipPrefillWebhookUrl,
                                    wizardRun.wipNumber,
                                    wizardRun.tenantId,
                                    tenant.sharedSecret,
                                    fields
                                );

                                if (n8nResponse.success && n8nResponse.values) {
                                    // n8n returns values keyed by tokenId — exactly what the frontend needs
                                    return api.success({
                                        prefillData: n8nResponse.values,
                                        tokenModes,
                                        source: 'wip_webhook',
                                    });
                                }
                            } catch (error) {
                                console.error('[Prefill] WIP webhook call failed:', error);
                                // Fall through to other prefill methods
                            }
                        }
                    }
                }
            }
        }

        // --- Path 2: ctx-token form with WIP number → live n8n prefill ---
        // When a form is opened via a prefill token (direct link), the frontend
        // passes _wipNumber so we can fetch fresh values from n8n for any fields
        // not already provided by the token.
        const requestBody = await request.json().catch(() => ({}));
        const wipNumberFromCtx = requestBody._wipNumber as string | undefined;

        if (wipNumberFromCtx && form.template?.mappings) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: form.tenantId },
                select: {
                    wipPrefillWebhookUrl: true,
                    sharedSecret: true,
                },
            });

            if (tenant?.wipPrefillWebhookUrl) {
                const prefillMappings = form.template.mappings.filter(
                    (m: { mode: string }) => m.mode === 'prefill'
                );

                const fields = prefillMappings.map(
                    (m: { payloadKey: string; tokenLabel: string; tokenId: string }) => ({
                        key: m.payloadKey,
                        label: m.tokenLabel,
                        tokenId: m.tokenId,
                    })
                );

                if (fields.length > 0) {
                    try {
                        const n8nResponse = await prefillFromWip(
                            tenant.wipPrefillWebhookUrl,
                            wipNumberFromCtx,
                            form.tenantId,
                            tenant.sharedSecret,
                            fields
                        );

                        if (n8nResponse.success && n8nResponse.values) {
                            return api.success({
                                prefillData: n8nResponse.values,
                                tokenModes,
                                source: 'wip_webhook_ctx',
                            });
                        }
                    } catch (error) {
                        console.error('[Prefill] WIP webhook call failed (ctx path):', error);
                        // Fall through to standard prefill
                    }
                }
            }
        }

        // --- Path 3: Standard webhook-based prefill (public forms) ---

        // Only live forms can use the standard prefill webhook
        if (form.status !== 'live') {
            // For non-live forms without a wizard assignment, return tokenModes only
            return api.success({ prefillData: {}, tokenModes });
        }

        // If no prefill webhook configured, return empty prefill but still return tokenModes
        if (!form.prefillWebhookUrl) {
            return api.success({ prefillData: {}, tokenModes });
        }

        // Forward request body parameters to webhook (already parsed above)
        const webhookUrl = new URL(form.prefillWebhookUrl);

        // SSRF protection: validate webhook URL before fetch
        const webhookValidation = validateWebhookUrl(webhookUrl.origin);
        if (!webhookValidation.valid) {
            console.error(`[Prefill] Blocked SSRF attempt for form ${form.id}: ${webhookValidation.error}`);
            return api.badRequest('Invalid prefill webhook configuration');
        }

        // Get tenant's shared secret for HMAC signing
        const tenant = await prisma.tenant.findUnique({
            where: { id: form.tenantId },
            select: { sharedSecret: true },
        });

        if (!tenant) {
            return api.internalError('Tenant configuration not found');
        }

        // Fetch from webhook with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        let webhookData: any;
        try {
            const outboundBody = JSON.stringify(requestBody);
            const hmac = createHmacSignature(outboundBody, tenant.sharedSecret);
            const signatureHeaders = buildSignatureHeaders(hmac);

            const response = await fetch(webhookUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'StatelessForms/1.0',
                    ...signatureHeaders,
                },
                body: outboundBody,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`Webhook returned ${response.status}`);
                return api.success({ prefillData: {}, error: 'Webhook unavailable' });
            }

            // Verify inbound HMAC signature
            const rawBody = await response.text();
            const sigHeaders = extractSignatureHeaders(response);
            if (!sigHeaders) {
                console.error(`[Prefill] HMAC mismatch: missing signature headers on webhook response for form ${form.id}`);
                return api.success({ prefillData: {}, error: 'HMAC mismatch: missing signature headers' });
            }
            const verification = verifyHmacSignature(rawBody, sigHeaders, tenant.sharedSecret);
            if (!verification.valid) {
                console.error(`[Prefill] ${verification.error}`);
                return api.success({ prefillData: {}, error: verification.error });
            }

            webhookData = JSON.parse(rawBody);
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            console.error('Webhook fetch error:', fetchError.message);
            // Graceful fallback - form still works without prefill
            return api.success({ prefillData: {}, error: 'Prefill unavailable' });
        }

        // Build mappings from TokenMappings
        // Priority: payloadKey -> tokenId (user-configured), then tokenLabel -> tokenId (original label)
        const templateMappings: Record<string, string> = {};
        // tokenModes was already built earlier, now just build payload mappings
        if (form.template?.mappings) {
            for (const mapping of form.template.mappings) {
                // First, map tokenLabel (original label from HTML) to tokenId
                // This handles webhooks that return the same labels as the template
                templateMappings[mapping.tokenLabel] = mapping.tokenId;

                // Then, map payloadKey (user-configured) to tokenId
                // This allows users to customize what webhook keys map to which fields
                if (mapping.payloadKey && mapping.payloadKey !== mapping.tokenLabel) {
                    templateMappings[mapping.payloadKey] = mapping.tokenId;
                }
            }
        }

        // Manual mappings override template mappings
        const manualMappings = (form.prefillFieldMappings as Record<string, string>) || {};

        // Combined mappings: manual overrides template
        const allMappings = { ...templateMappings, ...manualMappings };

        // Parse webhook response and apply mappings
        const prefillData: Record<string, any> = {};

        if (Array.isArray(webhookData)) {
            // Handle array of {label, value} objects
            for (const item of webhookData) {
                if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
                    const label = String(item.label);
                    const value = item.value;

                    // Check if we have a mapping for this label
                    const fieldName = allMappings[label];
                    if (fieldName) {
                        prefillData[fieldName] = sanitizeValue(value);
                    }
                }
            }
        } else if (typeof webhookData === 'object' && webhookData !== null) {
            // Handle flat object format
            for (const [key, value] of Object.entries(webhookData)) {
                const fieldName = allMappings[key] || key;
                prefillData[fieldName] = sanitizeValue(value);
            }
        }

        return api.success({ prefillData, tokenModes });
    } catch (err) {
        console.error('Prefill API error:', err);
        // Graceful fallback
        return api.success({ prefillData: {}, error: 'Prefill failed' });
    }
}

/**
 * Sanitize a value from webhook to prevent XSS or injection.
 * Uses HTML entity encoding for security instead of regex replacement.
 */
function sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        // HTML entity encoding - comprehensive XSS protection
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (typeof value === 'object') {
        const sanitized: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            sanitized[k] = sanitizeValue(v);
        }
        return sanitized;
    }
    return String(value);
}
