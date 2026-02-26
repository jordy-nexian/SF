/**
 * n8n webhook client for WIP Wizard operations.
 * All Quickbase access goes through n8n — we never call QB directly.
 */

import { createHmacSignature, buildSignatureHeaders, extractSignatureHeaders, verifyHmacSignature } from '@/lib/hmac';
import type {
    WipLookupPayload,
    WipPrefillPayload,
    N8nWipLookupRawResponse,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callN8nWebhook<T = any>(options: CallOptions): Promise<T> {
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

        // Read raw body first for HMAC verification
        const rawBody = await response.text();

        // Debug: log all response headers related to HMAC
        console.log('[Wizard HMAC] === Response Headers ===');
        console.log('[Wizard HMAC] X-Form-Signature:', response.headers.get('X-Form-Signature') || '(missing)');
        console.log('[Wizard HMAC] X-Form-Signature-Alg:', response.headers.get('X-Form-Signature-Alg') || '(missing)');
        console.log('[Wizard HMAC] X-Form-Signature-Ts:', response.headers.get('X-Form-Signature-Ts') || '(missing)');
        console.log('[Wizard HMAC] Response body (first 200 chars):', rawBody.slice(0, 200));
        console.log('[Wizard HMAC] Response body length:', rawBody.length);

        // Verify inbound HMAC signature
        const sigHeaders = extractSignatureHeaders(response);
        if (!sigHeaders) {
            console.error('[Wizard HMAC] All response headers:', Object.fromEntries(response.headers.entries()));
            throw new Error('HMAC mismatch: missing signature headers on n8n response (X-Form-Signature, X-Form-Signature-Alg, X-Form-Signature-Ts)');
        }

        // Debug: log what we're computing vs what we received
        const crypto = await import('node:crypto');
        const signingInput = sigHeaders.timestamp + '.' + rawBody;
        const debugHmac = crypto.createHmac('sha256', sharedSecret);
        debugHmac.update(signingInput, 'utf8');
        const expectedSig = debugHmac.digest('hex');
        console.log('[Wizard HMAC] === Verification Details ===');
        console.log('[Wizard HMAC] Received sig:', sigHeaders.signature);
        console.log('[Wizard HMAC] Expected sig:', expectedSig);
        console.log('[Wizard HMAC] Timestamp:', sigHeaders.timestamp);
        console.log('[Wizard HMAC] Signing input:', signingInput);
        console.log('[Wizard HMAC] Signing input length:', signingInput.length);
        console.log('[Wizard HMAC] Secret starts with:', sharedSecret.slice(0, 4) + '...');
        console.log('[Wizard HMAC] Match:', sigHeaders.signature === expectedSig);

        const verification = verifyHmacSignature(rawBody, sigHeaders, sharedSecret);
        if (!verification.valid) {
            throw new Error(`n8n response verification failed: ${verification.error}`);
        }

        return JSON.parse(rawBody) as T;
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
 * Normalised WIP lookup result (after parsing the n8n response).
 */
export interface WipLookupResult {
    found: boolean;
    companyName?: string;
    wipNumber?: string | number;
    /** All extra fields from Quickbase are stored here */
    metadata: Record<string, unknown>;
}

/**
 * Stage 1: Look up a WIP number via n8n → Quickbase.
 *
 * Handles multiple n8n response shapes:
 *   Values:  [{"values": {"WIPNumber": 54321, "CompanyName": "..."}}]   ← preferred
 *   Array:   [{"WIPNumber": 54321, "CompanyName": "..."}]               ← legacy
 *   Object:  {"WIPNumber": 54321, "CompanyName": "..."}                 ← legacy
 *   Wrapped: {"data": [{"WIPNumber": 54321, ...}]}                      ← legacy
 */
export async function lookupWip(
    webhookUrl: string,
    wipNumber: string,
    tenantId: string,
    sharedSecret: string
): Promise<WipLookupResult> {
    const payload: WipLookupPayload = {
        action: 'wip_lookup',
        wipNumber,
        tenantId,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await callN8nWebhook({
        webhookUrl,
        payload,
        sharedSecret,
    });

    // Debug: log the raw response shape so we can see what n8n sends
    console.log('[Wizard] n8n raw response type:', typeof raw, Array.isArray(raw) ? `array[${raw.length}]` : '');
    console.log('[Wizard] n8n raw response:', JSON.stringify(raw).slice(0, 500));

    // Normalise: extract records from various n8n response formats
    let records: N8nWipLookupRawResponse = [];

    if (Array.isArray(raw)) {
        // Check if first element uses `values` wrapper: [{ values: { ... } }]
        if (raw.length > 0 && raw[0]?.values && typeof raw[0].values === 'object') {
            records = [raw[0].values];
        } else {
            // Legacy format: [{WIPNumber: ..., CompanyName: ...}]
            records = raw;
        }
    } else if (raw && typeof raw === 'object') {
        if (raw.values && typeof raw.values === 'object') {
            // Format: { values: { WIPNumber: 54321, ... } }
            records = [raw.values];
        } else if (Array.isArray(raw.data)) {
            // Format: {data: [{WIPNumber: ..., CompanyName: ...}]}
            records = raw.data;
        } else if (raw.WIPNumber !== undefined) {
            // Format: {WIPNumber: 54321, CompanyName: "..."} (single object)
            records = [raw];
        }
    }

    if (records.length === 0) {
        console.log('[Wizard] No records found in n8n response');
        return { found: false, metadata: {} };
    }

    const record = records[0];

    // Pull out the known fields, put everything else in metadata
    const { WIPNumber, CompanyName, ...rest } = record;

    return {
        found: true,
        wipNumber: WIPNumber,
        companyName: CompanyName,
        metadata: rest,
    };
}

/**
 * Stage 3: Request prefill values for form fields via n8n → Quickbase.
 *
 * Handles multiple n8n response shapes (same as lookupWip):
 *   Array:   [{ success: true, values: { ... } }]
 *   Object:  { success: true, values: { ... } }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await callN8nWebhook({
        webhookUrl,
        payload,
        sharedSecret,
    });

    // Debug: log the raw response shape
    console.log('[Wizard] prefill raw response type:', typeof raw, Array.isArray(raw) ? `array[${raw.length}]` : '');
    console.log('[Wizard] prefill raw response:', JSON.stringify(raw).slice(0, 500));

    // Normalise: n8n often wraps responses in an array
    let result: N8nPrefillResponse;

    if (Array.isArray(raw) && raw.length > 0) {
        // Format: [{ success: true, values: { ... } }]
        result = raw[0] as N8nPrefillResponse;
    } else if (raw && typeof raw === 'object' && 'success' in raw) {
        // Format: { success: true, values: { ... } }
        result = raw as N8nPrefillResponse;
    } else {
        console.warn('[Wizard] Unexpected prefill response shape, returning error');
        result = { success: false, error: 'Unexpected response format from n8n' };
    }

    return result;
}
