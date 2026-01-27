/**
 * POST /api/portal/forms/[formId]/view
 * Mark a form assignment as "in_progress" when the customer views it.
 * Called when a portal user opens a form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyPortalSession, PORTAL_SESSION_COOKIE } from '@/lib/portal-auth';

interface RouteParams {
    params: Promise<{ formId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // Get portal session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyPortalSession(sessionCookie.value);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const { formId } = await params;

        // Find the assignment for this customer and form
        // Only update if status is 'pending' (don't downgrade from completed)
        const result = await prisma.formAssignment.updateMany({
            where: {
                endCustomerId: session.endCustomerId,
                formId: formId,
                status: 'pending',
            },
            data: {
                status: 'in_progress',
            },
        });

        return NextResponse.json({
            success: true,
            updated: result.count > 0,
        });
    } catch (error) {
        console.error('[Portal Form View] Error:', error);
        return NextResponse.json(
            { error: 'Failed to track view' },
            { status: 500 }
        );
    }
}
