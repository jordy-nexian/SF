import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
	const checks: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV,
		hasDbUrl: !!process.env.DATABASE_URL,
		dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + "...",
	};

	// Test database connection
	try {
		const start = Date.now();
		const result = await prisma.$queryRaw`SELECT 1 as test`;
		checks.database = {
			status: "connected",
			latencyMs: Date.now() - start,
			result,
		};
	} catch (err) {
		checks.database = {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
			errorName: err instanceof Error ? err.name : "Unknown",
		};
	}

	// Test if we can query a table
	try {
		const start = Date.now();
		const count = await prisma.tenant.count();
		checks.tenantTable = {
			status: "ok",
			count,
			latencyMs: Date.now() - start,
		};
	} catch (err) {
		checks.tenantTable = {
			status: "error",
			error: err instanceof Error ? err.message : String(err),
		};
	}

	const allHealthy = 
		checks.database && typeof checks.database === 'object' && 'status' in checks.database && checks.database.status === "connected" &&
		checks.tenantTable && typeof checks.tenantTable === 'object' && 'status' in checks.tenantTable && checks.tenantTable.status === "ok";

	return NextResponse.json(checks, { 
		status: allHealthy ? 200 : 503 
	});
}












