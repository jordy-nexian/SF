import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { canAddTeamMember } from "@/lib/usage";
import type { PlanId } from "@/lib/plans";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET list team members
export async function GET() {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	const users = await prisma.user.findMany({
		where: { tenantId: session.tenantId },
		select: {
			id: true,
			email: true,
			role: true,
			createdAt: true,
		},
		orderBy: { createdAt: "asc" },
	});

	return NextResponse.json({ users });
}

const inviteSchema = z.object({
	email: z.string().email(),
	role: z.enum(["admin", "viewer"]).optional().default("viewer"),
});

// POST invite team member
export async function POST(req: NextRequest) {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	// Check if user is owner/admin
	const currentUser = await prisma.user.findUnique({
		where: { id: session.userId },
		select: { role: true },
	});

	if (!currentUser || !["owner", "admin"].includes(currentUser.role)) {
		return NextResponse.json(
			{ error: "Only owners and admins can invite team members" },
			{ status: 403 }
		);
	}

	// Get tenant plan and name
	const tenant = await prisma.tenant.findUnique({
		where: { id: session.tenantId },
		select: { plan: true, name: true },
	});
	const plan = (tenant?.plan || 'free') as PlanId;

	// Check team member limit
	const limitCheck = await canAddTeamMember(session.tenantId, plan);
	if (!limitCheck.allowed) {
		return NextResponse.json(
			{
				error: `You've reached your limit of ${limitCheck.limit} team members. Please upgrade your plan to add more.`,
				code: "LIMIT_EXCEEDED",
				upgradeRequired: true,
			},
			{ status: 403 }
		);
	}

	const body = await req.json().catch(() => ({}));
	const parsed = inviteSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid email" }, { status: 400 });
	}

	const { email, role } = parsed.data;

	// Check if user already exists
	const existingUser = await prisma.user.findFirst({
		where: {
			email,
			tenantId: session.tenantId,
		},
	});

	if (existingUser) {
		return NextResponse.json(
			{ error: "User already exists in your organization" },
			{ status: 400 }
		);
	}

	// Generate temporary password
	const tempPassword = crypto.randomBytes(12).toString("base64url");
	const hashedPassword = await bcrypt.hash(tempPassword, 10);

	// Create user
	const user = await prisma.user.create({
		data: {
			email,
			passwordHash: hashedPassword,
			role,
			tenantId: session.tenantId,
		},
	});

	// Send invitation email
	const { sendTeamInviteEmail } = await import('@/lib/email');
	await sendTeamInviteEmail(
		email,
		tempPassword,
		tenant?.name || 'Stateless Forms'
	);

	// Return success (include temp password ONLY in dev for convenience)
	const response: { userId: string; email: string; tempPassword?: string } = {
		userId: user.id,
		email: user.email,
	};

	if (process.env.NODE_ENV === "development") {
		response.tempPassword = tempPassword;
	}

	return NextResponse.json(response, { status: 201 });
}

