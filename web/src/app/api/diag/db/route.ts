import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	try {
		// Simple connectivity check
		await prisma.$queryRaw`SELECT 1`;
		// Optionally, verify the User table exists
		const usersCount = await prisma.user.count().catch(() => -1);
		const info = (() => {
			try {
				const u = new URL(process.env.DATABASE_URL || "");
				return { host: u.hostname, port: u.port || "default", sslmode: u.searchParams.get("sslmode") };
			} catch {
				return { host: null, port: null, sslmode: null };
			}
		})();
		return NextResponse.json({ ok: true, usersCount, runtime: process.env.NEXT_RUNTIME || "node", db: info });
	} catch (err: any) {
		const info = (() => {
			try {
				const u = new URL(process.env.DATABASE_URL || "");
				return { host: u.hostname, port: u.port || "default", sslmode: u.searchParams.get("sslmode") };
			} catch {
				return { host: null, port: null, sslmode: null };
			}
		})();
		return NextResponse.json(
			{ ok: false, error: String(err?.message || err), runtime: process.env.NEXT_RUNTIME || "unknown", db: info },
			{ status: 500 }
		);
	}
}


