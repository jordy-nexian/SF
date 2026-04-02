/**
 * Magic link utilities for passwordless portal authentication.
 * Handles token generation, database storage, email sending, and validation.
 */

import { randomBytes, createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// Magic link settings
const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a secure magic link token (raw value sent to user).
 */
export function generateMagicLinkToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Hash a raw token for storage. Only the hash is persisted;
 * the plaintext travels in the email link and is never stored.
 */
export function hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Create a magic link token in the database and send email.
 * The DB stores a SHA-256 hash; the plaintext goes only in the email URL.
 */
export async function createAndSendMagicLink(
    endCustomerId: string,
    email: string,
    tenantName?: string
): Promise<{ success: boolean; error?: string }> {
    const rawToken = generateMagicLinkToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

    try {
        // Store only the hash — never the plaintext
        await prisma.magicLinkToken.create({
            data: {
                endCustomerId,
                token: tokenHash,
                expiresAt,
            },
        });

        // Build magic link URL (raw token in URL, hash in DB)
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const magicLinkUrl = `${baseUrl}/portal/auth/verify?token=${rawToken}`;

        // Send email
        const emailResult = await sendMagicLinkEmail(email, magicLinkUrl, tenantName);

        if (!emailResult.success) {
            await prisma.magicLinkToken.delete({ where: { token: tokenHash } }).catch(() => { });
            return { success: false, error: emailResult.error };
        }

        return { success: true };
    } catch (error) {
        console.error('[PortalAuth] Failed to create magic link:', error);
        return { success: false, error: 'Failed to create magic link' };
    }
}

/**
 * Validate a magic link token and return the end customer.
 * Uses hash-based lookup and a single atomic updateMany to prevent race conditions:
 * only the first request that matches (hash + unused + not expired) wins.
 */
export async function validateMagicLinkToken(rawToken: string): Promise<{
    success: boolean;
    endCustomer?: { id: string; tenantId: string; email: string; name: string | null };
    error?: string;
}> {
    try {
        const tokenHash = hashToken(rawToken);

        // Atomic consume: update only if unused and not expired.
        // updateMany returns { count } — if count === 0 the token was already
        // used, expired, or doesn't exist. This closes the race window.
        const consumed = await prisma.magicLinkToken.updateMany({
            where: {
                token: tokenHash,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: { usedAt: new Date() },
        });

        if (consumed.count === 0) {
            return { success: false, error: 'Invalid or expired link' };
        }

        // Token was consumed — now fetch the associated customer
        const magicLink = await prisma.magicLinkToken.findUnique({
            where: { token: tokenHash },
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

        if (!magicLink?.endCustomer) {
            return { success: false, error: 'Invalid link' };
        }

        return { success: true, endCustomer: magicLink.endCustomer };
    } catch (error) {
        console.error('[PortalAuth] Failed to validate magic link:', error);
        return { success: false, error: 'Failed to validate link' };
    }
}

/**
 * Send magic link email to end customer
 */
/**
 * Send a direct form invite email (used by wizard assign flow).
 * The link goes straight to the prefilled form — no portal auth needed.
 */
export async function sendFormInviteEmail(
    email: string,
    formUrl: string,
    tenantName?: string,
    tenantId?: string
): Promise<{ success: boolean; error?: string }> {
    const displayName = tenantName || 'Stateless Forms';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const portalUrl = tenantId ? `${baseUrl}/portal?tenant=${tenantId}` : `${baseUrl}/portal`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Complete your form - ${displayName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${displayName}</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #1e293b; margin-top: 0;">You have a form to complete</h2>

    <p>A form has been prepared for you. Click the button below to review and submit:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${formUrl}" style="display: inline-block; background: linear-gradient(to right, #10b981, #059669); color: white; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-weight: 600;">
        Complete Form
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <a href="${formUrl}" style="color: #6366f1; word-break: break-all;">${formUrl}</a>
    </p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="color: #475569; font-size: 14px; margin: 0;">
        You can also <a href="${portalUrl}" style="color: #6366f1; font-weight: 600;">sign in to your portal</a> to view all your assigned forms in one place.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      &copy; ${new Date().getFullYear()} ${displayName}. Secure forms portal.
    </p>
  </div>
</body>
</html>
`;

    const text = `
Complete your form - ${displayName}

A form has been prepared for you. Click here to review and submit:
${formUrl}

You can also sign in to your portal to view all your assigned forms:
${portalUrl}

${new Date().getFullYear()} ${displayName}
`;

    return sendEmail({
        to: email,
        subject: `Action required: Complete your form - ${displayName}`,
        html,
        text,
    });
}

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
