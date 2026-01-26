/**
 * POST /api/admin/assignments/[id]/remind
 * Send a reminder email for an incomplete form assignment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import { sendFormReminderEmail } from '@/lib/email';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        // Get assignment with customer and form details
        const assignment = await prisma.formAssignment.findFirst({
            where: {
                id,
                endCustomer: {
                    tenantId: session.user.tenantId,
                },
            },
            include: {
                endCustomer: {
                    select: { email: true, name: true },
                },
                form: {
                    select: { name: true },
                    include: {
                        tenant: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        if (assignment.status === 'completed') {
            return NextResponse.json(
                { error: 'Cannot send reminder for completed form' },
                { status: 400 }
            );
        }

        // Build portal URL
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const portalUrl = `${baseUrl}/portal`;

        // Send reminder email
        const result = await sendFormReminderEmail(
            assignment.endCustomer.email,
            assignment.endCustomer.name,
            assignment.form.name,
            portalUrl,
            assignment.dueDate,
            assignment.form.tenant.name
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send reminder' },
                { status: 500 }
            );
        }

        // Update last reminder sent timestamp
        await prisma.formAssignment.update({
            where: { id },
            data: { lastReminderSentAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${assignment.endCustomer.email}`,
        });
    } catch (error) {
        console.error('[Admin Assignments] Reminder error:', error);
        return NextResponse.json(
            { error: 'Failed to send reminder' },
            { status: 500 }
        );
    }
}
