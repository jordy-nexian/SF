/**
 * Admin API for managing form assignments.
 * 
 * GET /api/admin/assignments - List all assignments for tenant
 * POST /api/admin/assignments - Create a new assignment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

// GET - List all form assignments for the tenant
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');
        const formId = searchParams.get('formId');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        // Build where clause with tenant isolation
        const where: Record<string, unknown> = {
            endCustomer: {
                tenantId: session.user.tenantId,
            },
        };

        if (customerId) where.endCustomerId = customerId;
        if (formId) where.formId = formId;
        if (status) where.status = status;

        const [assignments, total] = await Promise.all([
            prisma.formAssignment.findMany({
                where,
                include: {
                    endCustomer: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
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
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.formAssignment.count({ where }),
        ]);

        return NextResponse.json({
            assignments: assignments.map(a => ({
                id: a.id,
                endCustomer: a.endCustomer,
                form: a.form,
                status: a.status,
                dueDate: a.dueDate?.toISOString() || null,
                completedAt: a.completedAt?.toISOString() || null,
                createdAt: a.createdAt.toISOString(),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin Assignments] List error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch assignments' },
            { status: 500 }
        );
    }
}

// POST - Create a new form assignment
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        if (!body.endCustomerId || !body.formId) {
            return NextResponse.json(
                { error: 'endCustomerId and formId are required' },
                { status: 400 }
            );
        }

        // Verify customer belongs to tenant
        const customer = await prisma.endCustomer.findFirst({
            where: {
                id: body.endCustomerId,
                tenantId: session.user.tenantId,
            },
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Verify form belongs to tenant
        const form = await prisma.form.findFirst({
            where: {
                id: body.formId,
                tenantId: session.user.tenantId,
            },
        });

        if (!form) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Check if assignment already exists
        const existing = await prisma.formAssignment.findUnique({
            where: {
                endCustomerId_formId: {
                    endCustomerId: body.endCustomerId,
                    formId: body.formId,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'This form is already assigned to this customer' },
                { status: 409 }
            );
        }

        // Create assignment
        const assignment = await prisma.formAssignment.create({
            data: {
                endCustomerId: body.endCustomerId,
                formId: body.formId,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                prefillData: body.prefillData || null,
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
                id: assignment.id,
                endCustomer: assignment.endCustomer,
                form: assignment.form,
                status: assignment.status,
                dueDate: assignment.dueDate?.toISOString() || null,
                createdAt: assignment.createdAt.toISOString(),
            },
        }, { status: 201 });
    } catch (error) {
        console.error('[Admin Assignments] Create error:', error);
        return NextResponse.json(
            { error: 'Failed to create assignment' },
            { status: 500 }
        );
    }
}
