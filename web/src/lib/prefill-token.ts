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
    d?: {                            // document context (WIP metadata)
        cn?: string;                 // companyName
        wn?: string | number;        // wipNumber (original Quickbase value)
        md?: Record<string, unknown>;// extra Quickbase fields
    };
}

export interface GeneratePrefillTokenOptions {
    publicId: string;
    tenantId: string;
    tokenValues: Record<string, string>;
    customerEmail?: string;
    customerName?: string;
    wipNumber?: string;
    wipContext?: {
        companyName?: string;
        wipNumber?: string | number;
        metadata?: Record<string, unknown>;
    };
    expiresInSeconds?: number;
}

/** Max serialised bytes for document context before it's omitted from the token */
const MAX_WIP_CONTEXT_BYTES = 2048;

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

    // Build document context from wipContext (compact keys to minimise URL)
    let documentContext: PrefillTokenPayload['d'] | undefined;
    if (options.wipContext) {
        const candidate: NonNullable<PrefillTokenPayload['d']> = {};
        if (options.wipContext.companyName) candidate.cn = options.wipContext.companyName;
        if (options.wipContext.wipNumber !== undefined) candidate.wn = options.wipContext.wipNumber;
        if (options.wipContext.metadata && Object.keys(options.wipContext.metadata).length > 0) {
            candidate.md = options.wipContext.metadata;
        }
        if (Object.keys(candidate).length > 0) {
            const serialised = JSON.stringify(candidate);
            if (Buffer.byteLength(serialised, 'utf8') <= MAX_WIP_CONTEXT_BYTES) {
                documentContext = candidate;
            } else {
                console.warn('[PrefillToken] wipContext exceeds size limit, omitting from token',
                    { size: Buffer.byteLength(serialised, 'utf8'), limit: MAX_WIP_CONTEXT_BYTES });
            }
        }
    }

    const jwePayload: Record<string, unknown> = {
        f: options.publicId,
        t: options.tenantId,
        v: options.tokenValues,
    };
    if (Object.keys(customerContext).length > 0) {
        jwePayload.c = customerContext;
    }
    if (documentContext) {
        jwePayload.d = documentContext;
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
            d: payload.d as PrefillTokenPayload['d'],
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
