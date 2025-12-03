import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const dynamic = "force-dynamic";

// POST start impersonation - returns user data for client to update session
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
			tenant: { select: { name: true } },
		},
	});

	if (!targetUser) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	// Return user data - client will use NextAuth's update() to set impersonation
	return NextResponse.json({
		success: true,
		user: {
			id: targetUser.id,
			email: targetUser.email,
			tenantId: targetUser.tenantId,
			role: targetUser.role,
		},
		tenantName: targetUser.tenant.name,
		impersonatingFrom: session?.user?.email || "",
	});
}

// DELETE stop impersonation
export async function DELETE() {
	const session = await getServerSession(authOptions);
	
	// Check if currently impersonating
	if (!(session as any)?.impersonating?.isImpersonating) {
		return NextResponse.json({ error: "Not impersonating" }, { status: 400 });
	}

	// Return success - client will use NextAuth's update() to clear impersonation
	return NextResponse.json({ success: true });
}

