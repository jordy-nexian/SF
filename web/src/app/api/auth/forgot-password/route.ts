import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

// Token expiration time: 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// Rate limit specifically for password reset requests (stricter)
const FORGOT_PASSWORD_LIMIT = {
	limit: 5,    // 5 requests
	windowMs: 15 * 60 * 1000,  // per 15 minutes
};

export async function POST(request: NextRequest) {
	try {
		// Rate limit by IP (stricter for password reset)
		const clientIp = getClientIp(request.headers);
		const rl = await rateLimit(`forgot-password:${clientIp}`, FORGOT_PASSWORD_LIMIT);
		if (!rl.success) {
			return NextResponse.json(
				{ 
					success: false, 
					message: 'Too many requests. Please try again later.' 
				},
				{ 
					status: 429,
					headers: {
						'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
					},
				}
			);
		}

		const body = await request.json().catch(() => null);
		const { email } = body ?? {};

		if (!email || typeof email !== 'string') {
			return NextResponse.json(
				{ success: false, message: 'Email is required' },
				{ status: 400 }
			);
		}

		// Normalize email
		const normalizedEmail = email.toLowerCase().trim();

		// Find user (don't reveal if user exists or not)
		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail },
			select: { id: true, email: true },
		});

		// Always return success to prevent email enumeration
		// but only actually send email if user exists
		if (user) {
			// Invalidate any existing tokens for this user
			await prisma.passwordResetToken.updateMany({
				where: {
					userId: user.id,
					usedAt: null,
					expiresAt: { gt: new Date() },
				},
				data: { expiresAt: new Date() }, // Expire immediately
			});

			// Generate secure token
			const token = crypto.randomBytes(32).toString('hex');
			const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

			// Save token
			await prisma.passwordResetToken.create({
				data: {
					userId: user.id,
					token,
					expiresAt,
				},
			});

			// Build reset URL
			const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
			const resetUrl = `${baseUrl}/reset-password?token=${token}`;

			// Send email
			const emailResult = await sendPasswordResetEmail(user.email, resetUrl);
			
			if (!emailResult.success) {
				console.error('[ForgotPassword] Failed to send email:', emailResult.error);
				// Still return success to user (don't reveal email issues)
			}
		}

		// Always return the same response to prevent timing attacks
		return NextResponse.json({
			success: true,
			message: 'If an account with that email exists, we\'ve sent a password reset link.',
		});
	} catch (error) {
		console.error('[ForgotPassword] Error:', error instanceof Error ? error.message : 'unknown');
		return NextResponse.json(
			{ success: false, message: 'An error occurred. Please try again.' },
			{ status: 500 }
		);
	}
}
