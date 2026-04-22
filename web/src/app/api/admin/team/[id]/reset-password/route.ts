/**
 * POST /api/admin/team/[id]/reset-password
 * Admin-initiated password reset for a team member.
 * Generates a reset token and emails the target user.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session.user.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only owners & admins can trigger password resets
        const actor = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, tenantId: true },
        });
        if (!actor || !['owner', 'admin'].includes(actor.role)) {
            return NextResponse.json(
                { error: 'Only owners and admins can reset team passwords' },
                { status: 403 }
            );
        }

        const { id } = await params;

        // The target user must be in the same tenant
        const targetUser = await prisma.user.findFirst({
            where: { id, tenantId: actor.tenantId },
            select: { id: true, email: true },
        });
        if (!targetUser) {
            return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
        }

        // Invalidate any outstanding tokens
        await prisma.passwordResetToken.updateMany({
            where: {
                userId: targetUser.id,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            data: { expiresAt: new Date() },
        });

        // Issue a fresh token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);
        await prisma.passwordResetToken.create({
            data: { userId: targetUser.id, token, expiresAt },
        });

        const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get('host')}`;
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        const emailResult = await sendPasswordResetEmail(targetUser.email, resetUrl);
        if (!emailResult.success) {
            console.error('[Admin ResetPassword] email failed:', emailResult.error);
            return NextResponse.json(
                { error: 'Reset link generated but email delivery failed. Try again shortly.' },
                { status: 502 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Password reset link sent to ${targetUser.email}`,
        });
    } catch (error) {
        console.error('[Admin ResetPassword] error:', error);
        return NextResponse.json({ error: 'Failed to send reset link' }, { status: 500 });
    }
}
