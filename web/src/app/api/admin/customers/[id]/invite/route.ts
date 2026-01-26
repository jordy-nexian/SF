/**
 * POST /api/admin/customers/[id]/invite
 * Send a magic link invitation to a customer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import { createAndSendMagicLink } from '@/lib/portal-auth';

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

        // Get customer and tenant info
        const customer = await prisma.endCustomer.findFirst({
            where: { id, tenantId: session.user.tenantId },
            include: {
                tenant: { select: { name: true } },
            },
        });

        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        // Send magic link
        const result = await createAndSendMagicLink(
            customer.id,
            customer.email,
            customer.tenant.name
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send invite' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Invitation sent to ${customer.email}`,
        });
    } catch (error) {
        console.error('[Admin Customers] Invite error:', error);
        return NextResponse.json(
            { error: 'Failed to send invite' },
            { status: 500 }
        );
    }
}
