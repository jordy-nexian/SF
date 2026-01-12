import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Minimum password requirements
const MIN_PASSWORD_LENGTH = 8;

// Rate limit for password reset attempts
const RESET_PASSWORD_LIMIT = {
	limit: 10,   // 10 attempts
	windowMs: 15 * 60 * 1000,  // per 15 minutes
};

export async function POST(request: NextRequest) {
	try {
		// Rate limit by IP
		const clientIp = getClientIp(request.headers);
		const rl = await rateLimit(`reset-password:${clientIp}`, RESET_PASSWORD_LIMIT);
		if (!rl.success) {
			return NextResponse.json(
				{ 
					success: false, 
					message: 'Too many attempts. Please try again later.' 
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
		const { token, password } = body ?? {};

		if (!token || typeof token !== 'string') {
			return NextResponse.json(
				{ success: false, message: 'Invalid or missing reset token' },
				{ status: 400 }
			);
		}

		if (!password || typeof password !== 'string') {
			return NextResponse.json(
				{ success: false, message: 'Password is required' },
				{ status: 400 }
			);
		}

		// Validate password strength
		if (password.length < MIN_PASSWORD_LENGTH) {
			return NextResponse.json(
				{ success: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
				{ status: 400 }
			);
		}

		// Find valid token
		const resetToken = await prisma.passwordResetToken.findUnique({
			where: { token },
			include: { user: { select: { id: true, email: true } } },
		});

		// Check if token exists, is not used, and not expired
		if (!resetToken) {
			return NextResponse.json(
				{ success: false, message: 'Invalid or expired reset link' },
				{ status: 400 }
			);
		}

		if (resetToken.usedAt) {
			return NextResponse.json(
				{ success: false, message: 'This reset link has already been used' },
				{ status: 400 }
			);
		}

		if (resetToken.expiresAt < new Date()) {
			return NextResponse.json(
				{ success: false, message: 'This reset link has expired' },
				{ status: 400 }
			);
		}

		// Hash new password
		const passwordHash = await bcrypt.hash(password, 12);

		// Update password and mark token as used (in transaction)
		await prisma.$transaction([
			prisma.user.update({
				where: { id: resetToken.userId },
				data: { passwordHash },
			}),
			prisma.passwordResetToken.update({
				where: { id: resetToken.id },
				data: { usedAt: new Date() },
			}),
		]);

		return NextResponse.json({
			success: true,
			message: 'Password has been reset successfully. You can now sign in.',
		});
	} catch (error) {
		console.error('[ResetPassword] Error:', error instanceof Error ? error.message : 'unknown');
		return NextResponse.json(
			{ success: false, message: 'An error occurred. Please try again.' },
			{ status: 500 }
		);
	}
}

// GET to validate token (for showing form)
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const token = url.searchParams.get('token');

		if (!token) {
			return NextResponse.json(
				{ valid: false, message: 'Missing token' },
				{ status: 400 }
			);
		}

		const resetToken = await prisma.passwordResetToken.findUnique({
			where: { token },
			select: { usedAt: true, expiresAt: true },
		});

		if (!resetToken) {
			return NextResponse.json(
				{ valid: false, message: 'Invalid reset link' },
				{ status: 400 }
			);
		}

		if (resetToken.usedAt) {
			return NextResponse.json(
				{ valid: false, message: 'This reset link has already been used' },
				{ status: 400 }
			);
		}

		if (resetToken.expiresAt < new Date()) {
			return NextResponse.json(
				{ valid: false, message: 'This reset link has expired' },
				{ status: 400 }
			);
		}

		return NextResponse.json({ valid: true });
	} catch (error) {
		console.error('[ResetPassword] Token check error:', error instanceof Error ? error.message : 'unknown');
		return NextResponse.json(
			{ valid: false, message: 'An error occurred' },
			{ status: 500 }
		);
	}
}
