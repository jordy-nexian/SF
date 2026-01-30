/**
 * Portal JWT utilities for end-customer session management.
 * Handles JWT creation and verification for portal sessions.
 */

import { SignJWT, jwtVerify } from 'jose';

// Portal JWT settings
const PORTAL_JWT_SECRET = new TextEncoder().encode(
    process.env.PORTAL_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-me'
);
const PORTAL_JWT_ISSUER = 'stateless-forms-portal';
const PORTAL_SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface PortalSession {
    endCustomerId: string;
    tenantId: string;
    email: string;
    name?: string;
    iat: number;
    exp: number;
}

/**
 * Create a portal session JWT
 */
export async function createPortalSession(endCustomer: {
    id: string;
    tenantId: string;
    email: string;
    name?: string | null;
}): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
        endCustomerId: endCustomer.id,
        tenantId: endCustomer.tenantId,
        email: endCustomer.email,
        name: endCustomer.name || undefined,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + PORTAL_SESSION_DURATION)
        .setIssuer(PORTAL_JWT_ISSUER)
        .sign(PORTAL_JWT_SECRET);

    return token;
}

/**
 * Verify and decode a portal session JWT
 */
export async function verifyPortalSession(token: string): Promise<PortalSession | null> {
    try {
        const { payload } = await jwtVerify(token, PORTAL_JWT_SECRET, {
            issuer: PORTAL_JWT_ISSUER,
        });

        return {
            endCustomerId: payload.endCustomerId as string,
            tenantId: payload.tenantId as string,
            email: payload.email as string,
            name: payload.name as string | undefined,
            iat: payload.iat as number,
            exp: payload.exp as number,
        };
    } catch (error) {
        console.error('[PortalAuth] JWT verification failed:', error instanceof Error ? error.message : 'unknown');
        return null;
    }
}

/**
 * Portal session cookie name
 */
export const PORTAL_SESSION_COOKIE = 'portal-session';

/**
 * Get portal session from request cookies
 */
export async function getPortalSessionFromCookies(
    cookies: { get: (name: string) => { value: string } | undefined }
): Promise<PortalSession | null> {
    const sessionCookie = cookies.get(PORTAL_SESSION_COOKIE);
    if (!sessionCookie?.value) {
        return null;
    }

    return verifyPortalSession(sessionCookie.value);
}
