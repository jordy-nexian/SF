/**
 * GET /api/admin/analytics/portal
 * Get portal analytics: customer counts, form completion rates, etc.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Get customer stats
        const [
            totalCustomers,
            totalAssignments,
            completedAssignments,
            pendingAssignments,
            inProgressAssignments,
            recentCustomers,
            formStats,
        ] = await Promise.all([
            // Total customers
            prisma.endCustomer.count({ where: { tenantId } }),

            // Total assignments
            prisma.formAssignment.count({
                where: { endCustomer: { tenantId } },
            }),

            // Completed assignments
            prisma.formAssignment.count({
                where: { endCustomer: { tenantId }, status: 'completed' },
            }),

            // Pending assignments
            prisma.formAssignment.count({
                where: { endCustomer: { tenantId }, status: 'pending' },
            }),

            // In progress assignments
            prisma.formAssignment.count({
                where: { endCustomer: { tenantId }, status: 'in_progress' },
            }),

            // Recent customers (last 30 days)
            prisma.endCustomer.count({
                where: {
                    tenantId,
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                },
            }),

            // Form completion stats
            prisma.form.findMany({
                where: { tenantId, status: 'live' },
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: { assignments: true },
                    },
                    assignments: {
                        where: { status: 'completed' },
                        select: { id: true },
                    },
                },
            }),
        ]);

        // Calculate completion rate
        const completionRate = totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
            : 0;

        // Format form stats
        const formCompletionStats = formStats.map(form => ({
            formId: form.id,
            formName: form.name,
            totalAssignments: form._count.assignments,
            completedAssignments: form.assignments.length,
            completionRate: form._count.assignments > 0
                ? Math.round((form.assignments.length / form._count.assignments) * 100)
                : 0,
        }));

        return NextResponse.json({
            overview: {
                totalCustomers,
                recentCustomers,
                totalAssignments,
                completedAssignments,
                pendingAssignments,
                inProgressAssignments,
                completionRate,
            },
            formStats: formCompletionStats,
        });
    } catch (error) {
        console.error('[Admin Analytics] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
