/**
 * Tenant Token Library
 * 
 * Provides HMAC-signed, stateless tokens for identifying Quickbase customers
 * without storing any data. Tokens contain a publicId (form), customerId, and expiry.
 * 
 * Token Format: base64(payload).hex_signature
 * 
 * Usage:
 *   // Generate (in n8n/Quickbase):
 *   const token = createTenantToken({ publicId: 'abc', customerId: 'QB-123', exp: Date.now()/1000 + 3600 }, secret);
 *   
 *   // Verify (in submit route):
 *   const result = verifyTenantToken(token, secret, 'abc');
 *   if (result.valid) { use result.payload.customerId }
 */

import crypto from 'node:crypto';

/**
 * Token payload structure
 */
export interface TenantTokenPayload {
    /** Form publicId - must match the route publicId for security */
    publicId: string;
    /** Quickbase WIP/customer identifier */
    customerId: string;
    /** Expiry timestamp (Unix seconds) */
    exp: number;
}

/**
 * Result of token verification
 */
export interface TenantTokenResult {
    valid: boolean;
    payload?: TenantTokenPayload;
    error?: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' | 'PUBLIC_ID_MISMATCH';
}

/**
 * Create a signed tenant token.
 * 
 * @param payload - Token payload with publicId, customerId, exp
 * @param secret - Tenant's shared secret for HMAC signing
 * @returns Signed token string in format: base64_payload.hex_signature
 */
export function createTenantToken(payload: TenantTokenPayload, secret: string): string {
    // Encode payload as base64
    const payloadJson = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64url');

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBase64, 'utf8');
    const signature = hmac.digest('hex');

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode a tenant token.
 * 
 * @param token - The full token string (base64.signature)
 * @param secret - Tenant's shared secret for verification
 * @param expectedPublicId - The publicId from the route (must match token)
 * @returns Verification result with decoded payload or error
 */
export function verifyTenantToken(
    token: string,
    secret: string,
    expectedPublicId: string
): TenantTokenResult {
    // Check format
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'INVALID_FORMAT' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
        return { valid: false, error: 'INVALID_FORMAT' };
    }

    const [payloadBase64, providedSignature] = parts;

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBase64, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(
        Buffer.from(providedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    )) {
        return { valid: false, error: 'INVALID_SIGNATURE' };
    }

    // Decode payload
    let payload: TenantTokenPayload;
    try {
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        payload = JSON.parse(payloadJson);
    } catch {
        return { valid: false, error: 'INVALID_FORMAT' };
    }

    // Validate payload structure
    if (!payload.publicId || !payload.customerId || typeof payload.exp !== 'number') {
        return { valid: false, error: 'INVALID_FORMAT' };
    }

    // Check expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
        return { valid: false, error: 'EXPIRED' };
    }

    // Verify publicId matches route
    if (payload.publicId !== expectedPublicId) {
        return { valid: false, error: 'PUBLIC_ID_MISMATCH' };
    }

    return { valid: true, payload };
}

/**
 * Helper to generate an expiry timestamp.
 * 
 * @param hoursFromNow - Number of hours until expiry
 * @returns Unix timestamp in seconds
 */
export function getExpiryTimestamp(hoursFromNow: number = 24): number {
    return Math.floor(Date.now() / 1000) + (hoursFromNow * 60 * 60);
}
