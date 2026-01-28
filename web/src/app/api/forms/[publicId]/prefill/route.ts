import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import * as api from '@/lib/api-response';
import { validateWebhookUrl } from '@/lib/webhook-validation';

export const dynamic = 'force-dynamic';

/**
 * Prefill API - Fetches data from configured webhook and returns mapped values
 * 
 * Webhook returns format: [{"label": "...", "value": ...}, ...]
 * 
 * Mapping sources (in priority order):
 * 1. Manual prefillFieldMappings (Form.prefillFieldMappings) - overrides
 * 2. TokenMappings from linked HtmlTemplate - auto from template
 * 3. Direct key match - fallback for flat objects
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ publicId: string }> }
) {
    try {
        const { publicId } = await context.params;

        // Get form with prefill config AND linked template with its mappings
        const form = await prisma.form.findUnique({
            where: { publicId },
            select: {
                id: true,
                status: true,
                prefillWebhookUrl: true,
                prefillFieldMappings: true,
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

        // Only live forms can be prefilled
        if (form.status !== 'live') {
            return api.badRequest('Form is not published');
        }

        // Build tokenModes from template mappings (needed regardless of webhook)
        const tokenModes: Record<string, string> = {};
        if (form.template?.mappings) {
            for (const mapping of form.template.mappings) {
                tokenModes[mapping.tokenId] = mapping.mode || 'prefill';
            }
        }

        // If no prefill webhook configured, return empty prefill but still return tokenModes
        if (!form.prefillWebhookUrl) {
            return api.success({ prefillData: {}, tokenModes });
        }

        // Forward query parameters to webhook (e.g., ?id=XYZ)
        const searchParams = request.nextUrl.searchParams;
        const webhookUrl = new URL(form.prefillWebhookUrl);
        searchParams.forEach((value, key) => {
            webhookUrl.searchParams.append(key, value);
        });

        // SSRF protection: validate webhook URL before fetch
        const webhookValidation = validateWebhookUrl(webhookUrl.origin);
        if (!webhookValidation.valid) {
            console.error(`[Prefill] Blocked SSRF attempt for form ${form.id}: ${webhookValidation.error}`);
            return api.badRequest('Invalid prefill webhook configuration');
        }

        // Fetch from webhook with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        let webhookData: any;
        try {
            const response = await fetch(webhookUrl.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'StatelessForms/1.0',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`Webhook returned ${response.status}`);
                return api.success({ prefillData: {}, error: 'Webhook unavailable' });
            }

            webhookData = await response.json();
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
