import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { logPlatformAudit } from "@/lib/platform-audit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { createImpersonationToken } from "@/lib/impersonation-token";

export const dynamic = "force-dynamic";

// Helper to extract IP and user agent from request
function getRequestContext(req: NextRequest) {
	const xff = req.headers.get("x-forwarded-for");
	const ipAddress = xff ? xff.split(",")[0]?.trim() : req.headers.get("x-real-ip") || undefined;
	const userAgent = req.headers.get("user-agent") || undefined;
	return { ipAddress, userAgent };
}

// POST start impersonation - returns a signed impersonation token
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);

	// Check if user is platform admin
	const platformSession = await requirePlatformAdmin();
	if (!platformSession) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const body = await req.json().catch(() => ({}));
	const { userId } = body as { userId: string };

	if (!userId) {
		return NextResponse.json({ error: "User ID required" }, { status: 400 });
	}

	// Get the target user
	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			tenantId: true,
			role: true,
			tenant: { select: { name: true, id: true } },
		},
	});

	if (!targetUser) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	// Audit log the impersonation start
	const { ipAddress, userAgent } = getRequestContext(req);
	await logPlatformAudit({
		adminEmail: platformSession.email,
		action: "impersonation.started",
		targetType: "user",
		targetId: targetUser.id,
		metadata: {
			targetEmail: targetUser.email,
			targetTenantId: targetUser.tenant.id,
			targetTenantName: targetUser.tenant.name,
			targetRole: targetUser.role,
		},
		ipAddress,
		userAgent,
	});

	// Create a signed impersonation token (valid for 30 seconds)
	const impersonationSecret = process.env.NEXTAUTH_SECRET;
	if (!impersonationSecret) {
		return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
	}

	const impersonationToken = createImpersonationToken({
		targetUserId: targetUser.id,
		targetTenantId: targetUser.tenantId,
		targetRole: targetUser.role,
		targetEmail: targetUser.email,
		adminUserId: session?.user?.id || "",
		adminEmail: session?.user?.email || "",
		adminTenantId: (session?.user as any)?.tenantId || "",
		adminRole: (session?.user as any)?.role || "",
		impersonatingFrom: session?.user?.email || "",
	}, impersonationSecret);

	return NextResponse.json({
		success: true,
		impersonationToken,
		tenantName: targetUser.tenant.name,
	});
}

// DELETE stop impersonation
export async function DELETE(req: NextRequest) {
	const session = await getServerSession(authOptions);

	// Check if currently impersonating
	if (!(session as any)?.impersonating?.isImpersonating) {
		return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
	}

	// Get the original admin email from the impersonation info
	const impersonatingFrom = (session as any)?.impersonating?.from as string;

	// Audit log the impersonation stop
	const { ipAddress, userAgent } = getRequestContext(req);
	await logPlatformAudit({
		adminEmail: impersonatingFrom || "unknown",
		action: "impersonation.stopped",
		targetType: "user",
		targetId: session?.user?.id || "unknown",
		metadata: {
			impersonatedEmail: session?.user?.email,
			impersonatedTenantId: session?.user?.tenantId,
		},
		ipAddress,
		userAgent,
	});

	// Return success - client will use NextAuth's update() to clear impersonation
	return NextResponse.json({ success: true });
}
