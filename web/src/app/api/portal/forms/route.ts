/**
 * GET /api/portal/forms
 * List all forms assigned to the current portal user.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
    verifyPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';

export async function GET() {
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

        // Get all form assignments for this end customer
        const assignments = await prisma.formAssignment.findMany({
            where: {
                endCustomerId: session.endCustomerId,
            },
            include: {
                form: {
                    select: {
                        id: true,
                        publicId: true,
                        name: true,
                        status: true,
                        thankYouMessage: true,
                    },
                },
            },
            orderBy: [
                { status: 'asc' }, // pending first, then in_progress, then completed
                { createdAt: 'desc' },
            ],
        });

        // Filter to only show live forms
        const activeForms = assignments
            .filter(a => a.form.status === 'live')
            .map(a => ({
                assignmentId: a.id,
                formId: a.form.id,
                publicId: a.form.publicId,
                name: a.form.name,
                status: a.status,
                dueDate: a.dueDate?.toISOString() || null,
                completedAt: a.completedAt?.toISOString() || null,
                createdAt: a.createdAt.toISOString(),
            }));

        return NextResponse.json({
            forms: activeForms,
            total: activeForms.length,
        });
    } catch (error) {
        console.error('[Portal Forms] List error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch forms' },
            { status: 500 }
        );
    }
}
