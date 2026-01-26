/**
 * Portal authentication utilities for end-customer magic link auth.
 * Separate from admin user auth (NextAuth credentials).
 */

import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// Portal JWT settings
const PORTAL_JWT_SECRET = new TextEncoder().encode(
    process.env.PORTAL_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-me'
);
const PORTAL_JWT_ISSUER = 'stateless-forms-portal';
const PORTAL_SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

// Magic link settings
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export interface PortalSession {
    endCustomerId: string;
    tenantId: string;
    email: string;
    name?: string;
    iat: number;
    exp: number;
}

/**
 * Generate a secure magic link token
 */
export function generateMagicLinkToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Create a magic link token in the database and send email
 */
export async function createAndSendMagicLink(
    endCustomerId: string,
    email: string,
    tenantName?: string
): Promise<{ success: boolean; error?: string }> {
    const token = generateMagicLinkToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    try {
        // Create token in database
        await prisma.magicLinkToken.create({
            data: {
                endCustomerId,
                token,
                expiresAt,
            },
        });

        // Build magic link URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const magicLinkUrl = `${baseUrl}/portal/auth/verify?token=${token}`;

        // Send email
        const emailResult = await sendMagicLinkEmail(email, magicLinkUrl, tenantName);

        if (!emailResult.success) {
            // Clean up token if email failed
            await prisma.magicLinkToken.delete({ where: { token } }).catch(() => { });
            return { success: false, error: emailResult.error };
        }

        return { success: true };
    } catch (error) {
        console.error('[PortalAuth] Failed to create magic link:', error);
        return { success: false, error: 'Failed to create magic link' };
    }
}

/**
 * Validate a magic link token and return the end customer
 */
export async function validateMagicLinkToken(token: string): Promise<{
    success: boolean;
    endCustomer?: { id: string; tenantId: string; email: string; name: string | null };
    error?: string;
}> {
    try {
        const magicLink = await prisma.magicLinkToken.findUnique({
            where: { token },
            include: {
                endCustomer: {
                    select: {
                        id: true,
                        tenantId: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        if (!magicLink) {
            return { success: false, error: 'Invalid or expired link' };
        }

        if (magicLink.usedAt) {
            return { success: false, error: 'Link has already been used' };
        }

        if (magicLink.expiresAt < new Date()) {
            return { success: false, error: 'Link has expired' };
        }

        // Mark token as used
        await prisma.magicLinkToken.update({
            where: { token },
            data: { usedAt: new Date() },
        });

        return { success: true, endCustomer: magicLink.endCustomer };
    } catch (error) {
        console.error('[PortalAuth] Failed to validate magic link:', error);
        return { success: false, error: 'Failed to validate link' };
    }
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
 * Send magic link email to end customer
 */
async function sendMagicLinkEmail(
    email: string,
    magicLinkUrl: string,
    tenantName?: string
): Promise<{ success: boolean; error?: string }> {
    const displayName = tenantName || 'Stateless Forms';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in to ${displayName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${displayName}</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">Sign in to your portal</h2>
    
    <p>Click the button below to securely access your forms portal:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}" style="display: inline-block; background: linear-gradient(to right, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 600;">
        Access Portal
      </a>
    </div>
    
    <p style="color: #64748b; font-size: 14px;">
      This link will expire in 15 minutes. If you didn't request this link, you can safely ignore this email.
    </p>
    
    <p style="color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${magicLinkUrl}" style="color: #6366f1; word-break: break-all;">${magicLinkUrl}</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      © ${new Date().getFullYear()} ${displayName}. Secure forms portal.
    </p>
  </div>
</body>
</html>
`;

    const text = `
Sign in to ${displayName}

Click here to access your forms portal:
${magicLinkUrl}

This link will expire in 15 minutes. If you didn't request this link, you can safely ignore this email.

© ${new Date().getFullYear()} ${displayName}
`;

    return sendEmail({
        to: email,
        subject: `Sign in to ${displayName}`,
        html,
        text,
    });
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
