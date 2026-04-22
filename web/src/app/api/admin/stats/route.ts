import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenantId = session.user.tenantId;

        // Count assignments grouped by status for this tenant
        const [pending, inProgress, completed] = await Promise.all([
            prisma.formAssignment.count({ where: { form: { tenantId }, status: 'pending' } }),
            prisma.formAssignment.count({ where: { form: { tenantId }, status: 'in_progress' } }),
            prisma.formAssignment.count({ where: { form: { tenantId }, status: 'completed' } }),
        ]);

        return NextResponse.json({
            total: pending + inProgress + completed,
            pending,
            inProgress,
            completed,
        });
    } catch (err) {
        console.error('[Admin Stats] error:', err);
        return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}
