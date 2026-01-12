import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// DELETE remove team member
export async function DELETE(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const { id } = await context.params;

	// Check if user is owner/admin
	const currentUser = await prisma.user.findUnique({
		where: { id: session.userId },
		select: { role: true },
	});
	
	if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
		return NextResponse.json(
			{ error: "Only owners and admins can remove team members" },
			{ status: 403 }
		);
	}

	// Can't delete yourself
	if (id === session.userId) {
		return NextResponse.json(
			{ error: "You cannot remove yourself" },
			{ status: 400 }
		);
	}

	// Get target user
	const targetUser = await prisma.user.findUnique({
		where: { id },
		select: { tenantId: true, role: true },
	});

	if (!targetUser || targetUser.tenantId !== session.tenantId) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}

	// Can't delete owners
	if (targetUser.role === "owner") {
		return NextResponse.json(
			{ error: "Cannot remove the organization owner" },
			{ status: 400 }
		);
	}

	await prisma.user.delete({ where: { id } });

	return NextResponse.json({ success: true });
}












