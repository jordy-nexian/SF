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
		select: { id: true, name: true },
	});
	if (!form) {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	// Get all stats in parallel
	const [
		totalSubmissions,
		last30DaysStats,
		dailyStats,
		stepStats,
		recentSubmissions,
	] = await Promise.all([
		// Total submissions all time
		prisma.submissionEvent.count({
			where: { formId: id },
		}),

		// Last 30 days aggregates
		prisma.submissionEvent.aggregate({
			where: {
				formId: id,
				submittedAt: { gte: thirtyDaysAgo },
			},
			_count: true,
			_avg: { durationMs: true },
		}),

		// Daily breakdown (last 30 days)
		prisma.$queryRaw<{ date: Date; total: bigint; success: bigint; errors: bigint }[]>`
			SELECT 
				DATE("submittedAt") as date,
				COUNT(*) as total,
				SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
				SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
			FROM "SubmissionEvent"
			WHERE "formId" = ${id}
				AND "submittedAt" >= ${thirtyDaysAgo}
			GROUP BY DATE("submittedAt")
			ORDER BY date ASC
		`,

		// Step reached stats (for drop-off analysis)
		prisma.$queryRaw<{ step: number; count: bigint }[]>`
			SELECT 
				COALESCE("stepReached", 1) as step,
				COUNT(*) as count
			FROM "SubmissionEvent"
			WHERE "formId" = ${id}
				AND "submittedAt" >= ${thirtyDaysAgo}
			GROUP BY COALESCE("stepReached", 1)
			ORDER BY step ASC
		`,

		// Recent submissions
		prisma.submissionEvent.findMany({
			where: { formId: id },
			orderBy: { submittedAt: "desc" },
			take: 20,
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

	// Calculate success/error counts for last 30 days
	const successCount = await prisma.submissionEvent.count({
		where: {
			formId: id,
			status: "success",
			submittedAt: { gte: thirtyDaysAgo },
		},
	});
	const errorCount = last30DaysStats._count - successCount;
	const successRate =
		last30DaysStats._count > 0
			? Math.round((successCount / last30DaysStats._count) * 100)
			: 0;

	// Format daily stats
	const formattedDailyStats = dailyStats.map((d) => ({
		date: d.date.toISOString().split("T")[0],
		submissions: Number(d.total),
		success: Number(d.success),
		errors: Number(d.errors),
	}));

	// Fill in missing days with zeros
	const allDays: typeof formattedDailyStats = [];
	for (let i = 29; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const dateStr = date.toISOString().split("T")[0];
		const existing = formattedDailyStats.find((d) => d.date === dateStr);
		allDays.push(existing || { date: dateStr, submissions: 0, success: 0, errors: 0 });
	}

	// Calculate step drop-off
	const stepDropoff = stepStats.map((s, i, arr) => {
		const count = Number(s.count);
		const prevCount = i > 0 ? Number(arr[i - 1].count) : count;
		const dropoffRate = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;
		return {
			step: s.step,
			count,
			dropoffRate: i > 0 ? dropoffRate : 0,
		};
	});

	return NextResponse.json({
		formName: form.name,
		totalSubmissions,
		last30Days: {
			total: last30DaysStats._count,
			success: successCount,
			errors: errorCount,
			successRate,
			avgLatencyMs: Math.round(last30DaysStats._avg.durationMs ?? 0),
		},
		dailyStats: allDays,
		stepDropoff,
		recentSubmissions,
	});
}



