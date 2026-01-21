import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireTenantSession, forbidden } from "@/lib/auth-helpers";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST() {
	const session = await requireTenantSession();
	if (!session) return forbidden();

	// Only owners and admins can regenerate the webhook secret
	if (session.role === "viewer") {
		return NextResponse.json(
			{ error: "Only owners and admins can regenerate secrets" },
			{ status: 403 }
		);
	}

	// Generate a new secure secret
	const newSecret = randomBytes(32).toString("hex");

	const updated = await prisma.tenant.update({
		where: { id: session.tenantId },
		data: { sharedSecret: newSecret },
		select: { sharedSecret: true },
	});

	return NextResponse.json({ sharedSecret: updated.sharedSecret });
}












