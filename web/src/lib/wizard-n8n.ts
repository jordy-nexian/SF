/**
 * n8n webhook client for WIP Wizard operations.
 * All Quickbase access goes through n8n — we never call QB directly.
 */

import { createHmacSignature, buildSignatureHeaders } from '@/lib/hmac';
import type {
    WipLookupPayload,
    WipPrefillPayload,
    N8nWipLookupResponse,
    N8nPrefillResponse,
} from '@/lib/wizard-validation';

const N8N_TIMEOUT_MS = 10_000; // 10 seconds

interface CallOptions {
    webhookUrl: string;
    payload: WipLookupPayload | WipPrefillPayload;
    sharedSecret: string;
}

/**
 * Generic n8n webhook caller with HMAC signing and timeout.
 */
async function callN8nWebhook<T>(options: CallOptions): Promise<T> {
    const { webhookUrl, payload, sharedSecret } = options;
    const body = JSON.stringify(payload);

    // Sign the request using the tenant's shared secret
    const hmac = createHmacSignature(body, sharedSecret);
    const signatureHeaders = buildSignatureHeaders(hmac);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...signatureHeaders,
            },
            body,
            signal: controller.signal,
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`n8n returned ${response.status}: ${errorText}`);
        }

        return await response.json() as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('n8n webhook timed out after 10 seconds');
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Stage 1: Look up a WIP number via n8n → Quickbase.
 */
export async function lookupWip(
    webhookUrl: string,
    wipNumber: string,
    tenantId: string,
    sharedSecret: string
): Promise<N8nWipLookupResponse> {
    const payload: WipLookupPayload = {
        action: 'wip_lookup',
        wipNumber,
        tenantId,
    };

    return callN8nWebhook<N8nWipLookupResponse>({
        webhookUrl,
        payload,
        sharedSecret,
    });
}

/**
 * Stage 3: Request prefill values for form fields via n8n → Quickbase.
 */
export async function prefillFromWip(
    webhookUrl: string,
    wipNumber: string,
    tenantId: string,
    sharedSecret: string,
    fields: Array<{ key: string; label: string; tokenId: string }>
): Promise<N8nPrefillResponse> {
    const payload: WipPrefillPayload = {
        action: 'wip_prefill',
        wipNumber,
        tenantId,
        fields,
    };

    return callN8nWebhook<N8nPrefillResponse>({
        webhookUrl,
        payload,
        sharedSecret,
    });
}
