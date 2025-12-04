import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { getUsageReport } from "@/lib/usage";
import type { PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET current usage and subscription status
export async function GET() {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: {
			plan: true,
			billingCycle: true,
			subscriptionStatus: true,
			currentPeriodEnd: true,
			cancelAtPeriodEnd: true,
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	const report = await getUsageReport(session.tenantId, tenant.plan as PlanId);

	return NextResponse.json({
		plan: tenant.plan,
		planName: report.planName,
		billingCycle: tenant.billingCycle,
		subscriptionStatus: tenant.subscriptionStatus,
		currentPeriodEnd: tenant.currentPeriodEnd?.toISOString() || null,
		cancelAtPeriodEnd: tenant.cancelAtPeriodEnd,
		usage: report.usage,
		limits: report.limits,
		features: report.features,
	});
}





