/**
 * Admin API for managing individual form assignments.
 * 
 * GET /api/admin/assignments/[id] - Get assignment details
 * PUT /api/admin/assignments/[id] - Update assignment
 * DELETE /api/admin/assignments/[id] - Delete assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get assignment details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const assignment = await prisma.formAssignment.findFirst({
            where: {
                id,
                endCustomer: {
                    tenantId: session.user.tenantId,
                },
            },
            include: {
                endCustomer: {
                    select: { id: true, email: true, name: true },
                },
                form: {
                    select: { id: true, publicId: true, name: true, status: true },
                },
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        return NextResponse.json({
            assignment: {
                id: assignment.id,
                endCustomer: assignment.endCustomer,
                form: assignment.form,
                status: assignment.status,
                dueDate: assignment.dueDate?.toISOString() || null,
                prefillData: assignment.prefillData,
                completedAt: assignment.completedAt?.toISOString() || null,
                createdAt: assignment.createdAt.toISOString(),
                updatedAt: assignment.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('[Admin Assignments] Get error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assignment' },
            { status: 500 }
        );
    }
}

// PUT - Update assignment
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        // Verify assignment belongs to tenant
        const existing = await prisma.formAssignment.findFirst({
            where: {
                id,
                endCustomer: {
                    tenantId: session.user.tenantId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        const updated = await prisma.formAssignment.update({
            where: { id },
            data: {
                status: body.status ?? existing.status,
                dueDate: body.dueDate !== undefined
                    ? (body.dueDate ? new Date(body.dueDate) : null)
                    : existing.dueDate,
                prefillData: body.prefillData !== undefined
                    ? body.prefillData
                    : existing.prefillData,
                completedAt: body.status === 'completed' && !existing.completedAt
                    ? new Date()
                    : existing.completedAt,
            },
            include: {
                endCustomer: {
                    select: { email: true, name: true },
                },
                form: {
                    select: { name: true, publicId: true },
                },
            },
        });

        return NextResponse.json({
            assignment: {
                id: updated.id,
                endCustomer: updated.endCustomer,
                form: updated.form,
                status: updated.status,
                dueDate: updated.dueDate?.toISOString() || null,
                completedAt: updated.completedAt?.toISOString() || null,
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('[Admin Assignments] Update error:', error);
        return NextResponse.json(
            { error: 'Failed to update assignment' },
            { status: 500 }
        );
    }
}

// DELETE - Delete assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;

        // Verify assignment belongs to tenant
        const existing = await prisma.formAssignment.findFirst({
            where: {
                id,
                endCustomer: {
                    tenantId: session.user.tenantId,
                },
            },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
        }

        await prisma.formAssignment.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin Assignments] Delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete assignment' },
            { status: 500 }
        );
    }
}
