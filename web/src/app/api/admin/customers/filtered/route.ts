import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company';
}

// Known AssignmentStatus enum values
const STATUS_VALUES = ['pending', 'in_progress', 'completed'] as const;
type AssignmentStatusFilter = typeof STATUS_VALUES[number];

/**
 * GET /api/admin/customers/filtered
 *   ?status=pending|in_progress|completed
 *   ?assignedBy=me|<userId>|all
 *
 * Returns companies that have FormAssignments matching the filters, with per-company stats.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const statusParam = searchParams.get('status');
        const assignedByParam = searchParams.get('assignedBy') || 'me';

        const statusFilter = STATUS_VALUES.includes(statusParam as AssignmentStatusFilter)
            ? (statusParam as AssignmentStatusFilter)
            : null;

        const resolvedAssignedByUserId =
            assignedByParam === 'me'
                ? session.user.id
                : assignedByParam === 'all'
                    ? null
                    : assignedByParam;

        const assignments = await prisma.formAssignment.findMany({
            where: {
                form: { tenantId: session.user.tenantId },
                ...(statusFilter ? { status: statusFilter } : {}),
                ...(resolvedAssignedByUserId ? { createdByUserId: resolvedAssignedByUserId } : {}),
            },
            include: {
                wizardRun: { select: { wipContext: true, wipNumber: true } },
                createdByUser: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Group by company (from wipContext.companyName, fall back to orgId/wipNumber)
        interface CompanyAgg {
            id: string;
            companyName: string;
            orgNumber: string | null;
            sourceCount: number;
            pending: number;
            inProgress: number;
            completed: number;
            assignedByEmails: Set<string>;
        }
        const companies = new Map<string, CompanyAgg>();

        for (const a of assignments) {
            const ctx = (a.wizardRun?.wipContext ?? {}) as {
                companyName?: string;
                metadata?: Record<string, unknown>;
            };
            const companyName = (ctx.companyName || '').trim() || 'Unknown';
            const meta = ctx.metadata ?? {};
            const orgIdRaw = meta.OrgID ?? meta.OrgId ?? meta.ORGNumber;
            const orgNumber = orgIdRaw != null ? String(orgIdRaw).trim() : null;
            const id = orgNumber ? `org-${orgNumber}` : `company-${slugify(companyName)}`;

            let entry = companies.get(id);
            if (!entry) {
                entry = {
                    id,
                    companyName,
                    orgNumber,
                    sourceCount: 0,
                    pending: 0,
                    inProgress: 0,
                    completed: 0,
                    assignedByEmails: new Set<string>(),
                };
                companies.set(id, entry);
            }
            entry.sourceCount += 1;
            if (a.status === 'pending') entry.pending += 1;
            else if (a.status === 'in_progress') entry.inProgress += 1;
            else if (a.status === 'completed') entry.completed += 1;
            if (a.createdByUser?.email) entry.assignedByEmails.add(a.createdByUser.email);
        }

        // Also return the list of available fund coordinators for the tenant (for the filter dropdown)
        const coordinators = await prisma.user.findMany({
            where: {
                tenantId: session.user.tenantId,
                role: { in: ['owner', 'admin', 'fund_coordinator'] },
            },
            select: { id: true, email: true, role: true },
            orderBy: { email: 'asc' },
        });

        return NextResponse.json({
            customers: Array.from(companies.values()).map(c => ({
                id: c.id,
                companyName: c.companyName,
                orgNumber: c.orgNumber,
                sourceCount: c.sourceCount,
                pending: c.pending,
                inProgress: c.inProgress,
                completed: c.completed,
                assignedBy: Array.from(c.assignedByEmails),
            })),
            coordinators,
            filters: {
                status: statusFilter,
                assignedBy: assignedByParam,
            },
        });
    } catch (error) {
        console.error('[Customers Filtered] error:', error);
        return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 });
    }
}
