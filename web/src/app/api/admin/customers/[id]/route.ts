/**
 * Admin API for managing individual end customers.
 * 
 * GET /api/admin/customers/[id] - Get customer details
 * PUT /api/admin/customers/[id] - Update customer
 * DELETE /api/admin/customers/[id] - Delete customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET - Get customer details
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const customer = await prisma.endCustomer.findFirst({
            where: {
                id,
                tenantId: session.user.tenantId,
            },
            include: {
                assignments: {
                    include: {
                        form: {
                            select: {
                                id: true,
                                publicId: true,
                                name: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        return NextResponse.json({
            customer: {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                externalId: customer.externalId,
                metadata: customer.metadata,
                createdAt: customer.createdAt.toISOString(),
                updatedAt: customer.updatedAt.toISOString(),
                assignments: customer.assignments.map(a => ({
                    id: a.id,
                    formId: a.form.id,
                    formPublicId: a.form.publicId,
                    formName: a.form.name,
                    formStatus: a.form.status,
                    status: a.status,
                    dueDate: a.dueDate?.toISOString() || null,
                    completedAt: a.completedAt?.toISOString() || null,
                    createdAt: a.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        console.error('[Admin Customers] Get error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customer' },
            { status: 500 }
        );
    }
}

// PUT - Update customer
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

        // Verify customer belongs to tenant
        const existing = await prisma.endCustomer.findFirst({
            where: { id, tenantId: session.user.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // If email is changing, check for duplicates
        if (body.email && body.email.toLowerCase() !== existing.email) {
            const duplicate = await prisma.endCustomer.findUnique({
                where: {
                    tenantId_email: {
                        tenantId: session.user.tenantId,
                        email: body.email.toLowerCase(),
                    },
                },
            });
            if (duplicate) {
                return NextResponse.json(
                    { error: 'Customer with this email already exists' },
                    { status: 409 }
                );
            }
        }

        const updated = await prisma.endCustomer.update({
            where: { id },
            data: {
                email: body.email?.trim().toLowerCase() ?? existing.email,
                name: body.name !== undefined ? (body.name?.trim() || null) : existing.name,
                externalId: body.externalId !== undefined ? (body.externalId?.trim() || null) : existing.externalId,
                metadata: body.metadata !== undefined ? body.metadata : existing.metadata,
            },
        });

        return NextResponse.json({
            customer: {
                id: updated.id,
                email: updated.email,
                name: updated.name,
                externalId: updated.externalId,
                metadata: updated.metadata,
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('[Admin Customers] Update error:', error);
        return NextResponse.json(
            { error: 'Failed to update customer' },
            { status: 500 }
        );
    }
}

// DELETE - Delete customer
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

        // Verify customer belongs to tenant
        const existing = await prisma.endCustomer.findFirst({
            where: { id, tenantId: session.user.tenantId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        await prisma.endCustomer.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Admin Customers] Delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete customer' },
            { status: 500 }
        );
    }
}
