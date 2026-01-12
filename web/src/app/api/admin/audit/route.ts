import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	// Only owners and admins can view audit logs
	if (session.role === "viewer") {
		return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
	}

	const url = new URL(req.url);
	const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
	const offset = parseInt(url.searchParams.get("offset") || "0");

	try {
		const logs = await prisma.$queryRaw<
			{
				id: string;
				userId: string;
				action: string;
				resourceType: string;
				resourceId: string;
				metadata: unknown;
				ipAddress: string | null;
				createdAt: Date;
			}[]
		>`
			SELECT "id", "userId", "action", "resourceType", "resourceId", "metadata", "ipAddress", "createdAt"
			FROM "AuditLog"
			WHERE "tenantId" = ${session.tenantId}
			ORDER BY "createdAt" DESC
			LIMIT ${limit}
			OFFSET ${offset}
		`;

		return NextResponse.json({ logs });
	} catch (err) {
		// Table might not exist yet
		console.error("Audit log query failed:", err);
		return NextResponse.json({ logs: [] });
	}
}












