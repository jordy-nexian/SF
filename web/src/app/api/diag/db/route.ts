import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
	try {
		// Simple connectivity check
		await prisma.$queryRaw`SELECT 1`;
		// Optionally, verify the User table exists
		const usersCount = await prisma.user.count().catch(() => -1);
		return NextResponse.json({ ok: true, usersCount });
	} catch (err: any) {
		return NextResponse.json(
			{ ok: false, error: String(err?.message || err) },
			{ status: 500 }
		);
	}
}


