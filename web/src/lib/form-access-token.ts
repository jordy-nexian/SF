/**
 * Form access token utilities for private form access.
 * Generates and validates JWTs that grant access to specific private forms.
 * 
 * Use case: Allow authorized users (e.g., end customers) to access private forms
 * via a secure link even without full authentication.
 */

import { SignJWT, jwtVerify } from 'jose';

// Form access token settings — fail-closed: no default secret in production
const rawFormAccessSecret = process.env.FORM_ACCESS_SECRET || process.env.NEXTAUTH_SECRET;
if (!rawFormAccessSecret && process.env.NODE_ENV === 'production') {
    throw new Error('[FormAccess] CRITICAL: FORM_ACCESS_SECRET or NEXTAUTH_SECRET is required in production');
}
const FORM_ACCESS_SECRET = new TextEncoder().encode(
    rawFormAccessSecret || 'dev-only-not-for-production'
);
const FORM_ACCESS_ISSUER = 'stateless-forms-access';
const DEFAULT_TOKEN_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface FormAccessTokenPayload {
    formId: string;
    publicId: string;
    tenantId: string;
    grantedTo?: string; // Optional: email or customer ID
    iat: number;
    exp: number;
}

export interface GenerateTokenOptions {
    formId: string;
    publicId: string;
    tenantId: string;
    grantedTo?: string;
    expiresInSeconds?: number;
}

/**
 * Generate a form access token that grants access to a specific private form.
 */
export async function generateFormAccessToken(
    options: GenerateTokenOptions
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = options.expiresInSeconds ?? DEFAULT_TOKEN_DURATION;

    const token = await new SignJWT({
        formId: options.formId,
        publicId: options.publicId,
        tenantId: options.tenantId,
        grantedTo: options.grantedTo,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(now)
        .setExpirationTime(now + expiresIn)
        .setIssuer(FORM_ACCESS_ISSUER)
        .sign(FORM_ACCESS_SECRET);

    return token;
}

/**
 * Validate a form access token and return the payload if valid.
 * Returns null if token is invalid, expired, or doesn't match the form.
 */
export async function validateFormAccessToken(
    token: string,
    expectedPublicId: string
): Promise<FormAccessTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, FORM_ACCESS_SECRET, {
            issuer: FORM_ACCESS_ISSUER,
        });

        // Verify the token is for this specific form
        if (payload.publicId !== expectedPublicId) {
            console.warn('[FormAccess] Token publicId mismatch:', {
                expected: expectedPublicId,
                actual: payload.publicId,
            });
            return null;
        }

        return {
            formId: payload.formId as string,
            publicId: payload.publicId as string,
            tenantId: payload.tenantId as string,
            grantedTo: payload.grantedTo as string | undefined,
            iat: payload.iat as number,
            exp: payload.exp as number,
        };
    } catch (error) {
        console.error(
            '[FormAccess] Token validation failed:',
            error instanceof Error ? error.message : 'unknown'
        );
        return null;
    }
}

/**
 * Build a form access URL with embedded token.
 */
export function buildFormAccessUrl(
    baseUrl: string,
    publicId: string,
    token: string
): string {
    return `${baseUrl}/f/${publicId}?token=${token}`;
}
