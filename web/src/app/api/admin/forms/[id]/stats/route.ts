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

	// Verify form belongs to tenant
	const form = await prisma.form.findFirst({
		where: { id, tenantId: session.tenantId },
		select: { id: true },
	});
	if (!form) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	// Get submission stats for last 30 days
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [totalSubmissions, successCount, errorCount, avgLatency, recentSubmissions] =
		await Promise.all([
			// Total submissions all time
			prisma.submissionEvent.count({
				where: { formId: id },
			}),
			// Success count (last 30 days)
			prisma.submissionEvent.count({
				where: {
					formId: id,
					status: "success",
					submittedAt: { gte: thirtyDaysAgo },
				},
			}),
			// Error count (last 30 days)
			prisma.submissionEvent.count({
				where: {
					formId: id,
					status: "error",
					submittedAt: { gte: thirtyDaysAgo },
				},
			}),
			// Average latency (last 30 days)
			prisma.submissionEvent.aggregate({
				where: {
					formId: id,
					submittedAt: { gte: thirtyDaysAgo },
				},
				_avg: { durationMs: true },
			}),
			// Recent submissions (last 10)
			prisma.submissionEvent.findMany({
				where: { formId: id },
				orderBy: { submittedAt: "desc" },
				take: 10,
				select: {
					id: true,
					submissionId: true,
					status: true,
					httpCode: true,
					durationMs: true,
					submittedAt: true,
					fieldCount: true,
				},
			}),
		]);

	const last30Days = successCount + errorCount;
	const successRate = last30Days > 0 ? Math.round((successCount / last30Days) * 100) : 0;

	return NextResponse.json({
		totalSubmissions,
		last30Days: {
			total: last30Days,
			success: successCount,
			errors: errorCount,
			successRate,
			avgLatencyMs: Math.round(avgLatency._avg.durationMs ?? 0),
		},
		recentSubmissions,
	});
}





