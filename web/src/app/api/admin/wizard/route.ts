/**
 * GET  /api/admin/wizard         — List wizard runs for this tenant
 * PATCH /api/admin/wizard/:id    — Handled in [id]/route.ts
 * 
 * This file handles the list endpoint only.
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden('Only owners and admins can access wizard runs');
        }

        const { searchParams } = new URL(request.url);
        const state = searchParams.get('state');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 100);

        // Build where clause
        const where: Record<string, unknown> = {
            tenantId: session.tenantId,
        };
        if (state) where.state = state;

        const [wizardRuns, total] = await Promise.all([
            prisma.wizardRun.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    createdBy: {
                        select: { id: true, email: true },
                    },
                    template: {
                        select: { id: true, name: true },
                    },
                    endCustomer: {
                        select: { id: true, email: true, name: true },
                    },
                },
            }),
            prisma.wizardRun.count({ where }),
        ]);

        return api.success({
            wizardRuns: wizardRuns.map((wr) => ({
                id: wr.id,
                wipNumber: wr.wipNumber,
                wipContext: wr.wipContext,
                state: wr.state,
                template: wr.template,
                endCustomer: wr.endCustomer,
                createdBy: wr.createdBy,
                inviteSent: wr.inviteSent,
                createdAt: wr.createdAt.toISOString(),
                updatedAt: wr.updatedAt.toISOString(),
                completedAt: wr.completedAt?.toISOString() || null,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Wizard] List error:', error);
        return api.internalError('Failed to fetch wizard runs');
    }
}
