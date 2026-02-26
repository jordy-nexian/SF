/**
 * Signed impersonation tokens for secure admin session switching.
 *
 * The platform impersonation API issues a short-lived HMAC-signed token
 * containing the target user's details. The JWT callback verifies this token
 * before applying any session changes — preventing direct session manipulation.
 *
 * Token format: base64url(JSON payload).hex(HMAC-SHA256 signature)
 * Max age: 30 seconds (enough for the client roundtrip)
 */

import crypto from 'node:crypto';

const IMPERSONATION_TOKEN_MAX_AGE_SEC = 30;

export interface ImpersonationTokenPayload {
    targetUserId: string;
    targetTenantId: string;
    targetRole: string;
    targetEmail: string;
    adminUserId: string;
    adminEmail: string;
    adminTenantId: string;
    adminRole: string;
    impersonatingFrom: string;
    iat: number; // Unix seconds
}

/**
 * Create a signed impersonation token.
 * Called by the platform impersonation API after verifying admin privileges.
 */
export function createImpersonationToken(
    payload: Omit<ImpersonationTokenPayload, 'iat'>,
    secret: string
): string {
    const fullPayload: ImpersonationTokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
    };

    const payloadJson = JSON.stringify(fullPayload);
    const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64url');

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBase64, 'utf8');
    const signature = hmac.digest('hex');

    return `${payloadBase64}.${signature}`;
}

/**
 * Verify and decode an impersonation token.
 * Called by the JWT callback to validate session update requests.
 *
 * Returns the payload if valid, null if invalid/expired/tampered.
 */
export function verifyImpersonationToken(
    token: string,
    secret: string
): ImpersonationTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, providedSignature] = parts;

    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBase64, 'utf8');
    const expectedSignature = hmac.digest('hex');

    const sigBuf = Buffer.from(providedSignature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    // Decode payload
    let payload: ImpersonationTokenPayload;
    try {
        const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        payload = JSON.parse(payloadJson);
    } catch {
        return null;
    }

    // Validate required fields
    if (!payload.targetUserId || !payload.targetTenantId || !payload.adminUserId || !payload.iat) {
        return null;
    }

    // Check token age (max 30 seconds)
    const ageSec = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSec > IMPERSONATION_TOKEN_MAX_AGE_SEC || ageSec < -5) {
        return null; // expired or clock skew
    }

    return payload;
}
