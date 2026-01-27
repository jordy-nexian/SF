/**
 * POST /api/portal/forms/[formId]/start
 * Mark a form assignment as "in_progress" when the user opens it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
    verifyPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const session = await verifyPortalSession(sessionCookie.value);

        if (!session) {
            return NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            );
        }

        const { formId } = await params;

        // Find the assignment for this form and end customer
        const assignment = await prisma.formAssignment.findFirst({
            where: {
                formId,
                endCustomerId: session.endCustomerId,
            },
        });

        if (!assignment) {
            return NextResponse.json(
                { error: 'Form assignment not found' },
                { status: 404 }
            );
        }

        // Only update if currently pending (don't downgrade from in_progress or completed)
        if (assignment.status === 'pending') {
            await prisma.formAssignment.update({
                where: { id: assignment.id },
                data: { status: 'in_progress' },
            });
        }

        return NextResponse.json({
            success: true,
            status: assignment.status === 'pending' ? 'in_progress' : assignment.status,
        });
    } catch (error) {
        console.error('[Portal Forms] Start error:', error);
        return NextResponse.json(
            { error: 'Failed to update form status' },
            { status: 500 }
        );
    }
}
