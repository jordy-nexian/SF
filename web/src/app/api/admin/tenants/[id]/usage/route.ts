import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();
	const { id } = await context.params;
	if (id !== session.tenantId) return forbidden();

	const since = new Date();
	since.setDate(since.getDate() - 30);

	const [counts, latency] = await Promise.all([
		prisma.submissionEvent.groupBy({
			by: ["status"],
			where: { tenantId: id, submittedAt: { gte: since } },
			_count: { _all: true },
		}),
		prisma.submissionEvent.aggregate({
			where: { tenantId: id, submittedAt: { gte: since } },
			_avg: { durationMs: true },
		}),
	]);

	return NextResponse.json({
		since: since.toISOString(),
		counts: counts.reduce(
			(acc, row) => ({ ...acc, [row.status]: row._count._all }),
			{} as Record<string, number>
		),
		averageLatencyMs: latency._avg.durationMs ?? 0,
	});
}















