/**
 * Prefill context token for wizard-assigned forms.
 * Encrypts prefill values + customer identity into a JWE token
 * that travels in the form URL (?ctx=...), keeping the system stateless.
 * Uses AES-256-GCM — the URL is fully opaque and cannot be decoded
 * without the server secret.
 */

import { EncryptJWT, jwtDecrypt } from 'jose';
import { createHash } from 'crypto';

// Derive a 32-byte encryption key (required for A256GCM) from the app secret
const rawSecret = process.env.FORM_ACCESS_SECRET || process.env.NEXTAUTH_SECRET;
if (!rawSecret && process.env.NODE_ENV === 'production') {
    throw new Error('[PrefillToken] CRITICAL: FORM_ACCESS_SECRET or NEXTAUTH_SECRET is required in production');
}
const PREFILL_KEY = createHash('sha256')
    .update(rawSecret || 'dev-only-not-for-production')
    .digest(); // 32-byte Buffer

const PREFILL_ISSUER = 'stateless-forms-prefill';
const DEFAULT_EXPIRY = 30 * 24 * 60 * 60; // 30 days in seconds

/** Compact JWE payload — short keys to minimise URL length */
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
 * Generate an encrypted prefill context token (JWE).
 * The resulting string is opaque — it cannot be read without the server secret.
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

    const jwePayload: Record<string, unknown> = {
        f: options.publicId,
        t: options.tenantId,
        v: options.tokenValues,
    };
    if (Object.keys(customerContext).length > 0) {
        jwePayload.c = customerContext;
    }

    return new EncryptJWT(jwePayload)
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .setIssuer(PREFILL_ISSUER)
        .encrypt(PREFILL_KEY);
}

/**
 * Decrypt and verify a prefill context token.
 * Returns null on any failure (expired, tampered, wrong form, bad key).
 */
export async function verifyPrefillToken(
    token: string,
    expectedPublicId: string
): Promise<PrefillTokenPayload | null> {
    try {
        const { payload } = await jwtDecrypt(token, PREFILL_KEY, {
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
            '[PrefillToken] Decryption failed:',
            error instanceof Error ? error.message : 'unknown'
        );
        return null;
    }
}

/**
 * Build a form URL with the encrypted prefill context token.
 */
export function buildPrefillUrl(
    baseUrl: string,
    publicId: string,
    token: string
): string {
    return `${baseUrl}/f/${publicId}?ctx=${token}`;
}
