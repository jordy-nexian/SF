/**
 * Prefill context token for wizard-assigned forms.
 * Encodes prefill values + customer identity into a signed JWT
 * that travels in the form URL (?ctx=...), keeping the system stateless.
 */

import { SignJWT, jwtVerify } from 'jose';

// Reuse the same secret as form-access-token.ts (app-internal, not shared with n8n)
const rawSecret = process.env.FORM_ACCESS_SECRET || process.env.NEXTAUTH_SECRET;
if (!rawSecret && process.env.NODE_ENV === 'production') {
    throw new Error('[PrefillToken] CRITICAL: FORM_ACCESS_SECRET or NEXTAUTH_SECRET is required in production');
}
const PREFILL_SECRET = new TextEncoder().encode(
    rawSecret || 'dev-only-not-for-production'
);
const PREFILL_ISSUER = 'stateless-forms-prefill';
const DEFAULT_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

/** Compact JWT payload — short keys to minimise URL length */
export interface PrefillTokenPayload {
    f: string;                       // publicId (for route validation)
    t: string;                       // tenantId
    v: Record<string, string>;       // tokenId → value
    c?: {                            // customer context
        e?: string;                  // email
        n?: string;                  // name
        w?: string;                  // WIP number
    };
}

export interface GeneratePrefillTokenOptions {
    publicId: string;
    tenantId: string;
    tokenValues: Record<string, string>;
    customerEmail?: string;
    customerName?: string;
    wipNumber?: string;
    expiresInSeconds?: number;
}

/**
 * Generate a signed prefill context token.
 */
export async function generatePrefillToken(
    options: GeneratePrefillTokenOptions
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresInSeconds ?? DEFAULT_EXPIRY;

    const customerContext: PrefillTokenPayload['c'] = {};
    if (options.customerEmail) customerContext.e = options.customerEmail;
    if (options.customerName) customerContext.n = options.customerName;
    if (options.wipNumber) customerContext.w = options.wipNumber;

    const jwtPayload: Record<string, unknown> = {
        f: options.publicId,
        t: options.tenantId,
        v: options.tokenValues,
    };
    if (Object.keys(customerContext).length > 0) {
        jwtPayload.c = customerContext;
    }

    return new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .setIssuer(PREFILL_ISSUER)
        .sign(PREFILL_SECRET);
}

/**
 * Verify a prefill context token and return the payload.
 * Returns null on any failure (expired, tampered, wrong form).
 */
export async function verifyPrefillToken(
    token: string,
    expectedPublicId: string
): Promise<PrefillTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, PREFILL_SECRET, {
            issuer: PREFILL_ISSUER,
        });

        if (payload.f !== expectedPublicId) {
            console.warn('[PrefillToken] publicId mismatch:', {
                expected: expectedPublicId,
                actual: payload.f,
            });
            return null;
        }

        return {
            f: payload.f as string,
            t: payload.t as string,
            v: payload.v as Record<string, string>,
            c: payload.c as PrefillTokenPayload['c'],
        };
    } catch (error) {
        console.error(
            '[PrefillToken] Validation failed:',
            error instanceof Error ? error.message : 'unknown'
        );
        return null;
    }
}

/**
 * Build a form URL with the prefill context token.
 */
export function buildPrefillUrl(
    baseUrl: string,
    publicId: string,
    token: string
): string {
    return `${baseUrl}/f/${publicId}?ctx=${token}`;
}
