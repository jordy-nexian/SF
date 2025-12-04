import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

// GET all tenants
export async function GET() {
	const session = await requirePlatformAdmin();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const tenants = await prisma.tenant.findMany({
		orderBy: { createdAt: 'desc' },
		select: {
			id: true,
			name: true,
			plan: true,
			subscriptionStatus: true,
			billingCycle: true,
			createdAt: true,
			_count: {
				select: {
					users: true,
					forms: true,
				},
			},
		},
	});

	// Get submission counts per tenant for this month
	const submissionCounts = await prisma.submissionEvent.groupBy({
		by: ['tenantId'],
		where: { submittedAt: { gte: startOfMonth } },
		_count: { id: true },
	});

	const submissionMap = new Map(
		submissionCounts.map(s => [s.tenantId, s._count.id])
	);

	const enrichedTenants = tenants.map(t => ({
		...t,
		usage: {
			submissionsThisMonth: submissionMap.get(t.id) || 0,
		},
	}));

	return NextResponse.json({ tenants: enrichedTenants });
}





