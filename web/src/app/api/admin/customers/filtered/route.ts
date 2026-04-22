import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/customers/filtered
 * Returns a flat list of the tenant's FormAssignments with the company context
 * and who assigned them — used for client-side filtering on the home page.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const assignments = await prisma.formAssignment.findMany({
            where: { form: { tenantId: session.user.tenantId } },
            include: {
                wizardRun: { select: { wipContext: true } },
                createdByUser: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const aggregates = assignments.map(a => {
            const ctx = (a.wizardRun?.wipContext ?? {}) as {
                companyName?: string;
                metadata?: Record<string, unknown>;
            };
            const companyName = (ctx.companyName || '').trim();
            const meta = ctx.metadata ?? {};
            const orgIdRaw = meta.OrgID ?? meta.OrgId ?? meta.ORGNumber;
            const orgNumber = orgIdRaw != null ? String(orgIdRaw).trim() : null;
            return {
                companyName,
                orgNumber,
                status: a.status,
                assignedByUserId: a.createdByUser?.id ?? null,
                assignedByEmail: a.createdByUser?.email ?? null,
            };
        });

        const coordinators = await prisma.user.findMany({
            where: {
                tenantId: session.user.tenantId,
                role: { in: ['owner', 'admin', 'fund_coordinator'] },
            },
            select: { id: true, email: true, role: true },
            orderBy: { email: 'asc' },
        });

        return NextResponse.json({ aggregates, coordinators });
    } catch (error) {
        console.error('[Customers Filtered] error:', error);
        return NextResponse.json({ error: 'Failed to load assignments' }, { status: 500 });
    }
}
