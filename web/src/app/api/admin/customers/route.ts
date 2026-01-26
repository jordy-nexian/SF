/**
 * Admin API for managing end customers (portal users).
 * 
 * GET /api/admin/customers - List all customers for tenant
 * POST /api/admin/customers - Create a new customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import { createAndSendMagicLink } from '@/lib/portal-auth';

// GET - List all end customers for the tenant
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const search = searchParams.get('search') || '';

        const where = {
            tenantId: session.user.tenantId,
            ...(search && {
                OR: [
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { name: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [customers, total] = await Promise.all([
            prisma.endCustomer.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    externalId: true,
                    metadata: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { assignments: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.endCustomer.count({ where }),
        ]);

        return NextResponse.json({
            customers: customers.map(c => ({
                ...c,
                assignmentCount: c._count.assignments,
                _count: undefined,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Admin Customers] List error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}

// POST - Create a new end customer
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only owner/admin can create customers
        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        if (!body.email || typeof body.email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const email = body.email.trim().toLowerCase();

        // Check if customer already exists for this tenant
        const existing = await prisma.endCustomer.findUnique({
            where: {
                tenantId_email: {
                    tenantId: session.user.tenantId,
                    email,
                },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Customer with this email already exists' },
                { status: 409 }
            );
        }

        // Create the customer
        const customer = await prisma.endCustomer.create({
            data: {
                tenantId: session.user.tenantId,
                email,
                name: body.name?.trim() || null,
                externalId: body.externalId?.trim() || null,
                metadata: body.metadata || null,
            },
        });

        // Optionally send invite immediately
        if (body.sendInvite) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: session.user.tenantId },
                select: { name: true },
            });
            await createAndSendMagicLink(customer.id, customer.email, tenant?.name);
        }

        return NextResponse.json({
            customer: {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                externalId: customer.externalId,
                createdAt: customer.createdAt.toISOString(),
            },
            inviteSent: body.sendInvite || false,
        }, { status: 201 });
    } catch (error) {
        console.error('[Admin Customers] Create error:', error);
        return NextResponse.json(
            { error: 'Failed to create customer' },
            { status: 500 }
        );
    }
}
