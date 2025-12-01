import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const signupSchema = z.object({
	orgName: z.string().min(1, "Organization name is required").max(100),
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
	try {
		const body = await req.json().catch(() => ({}));
		const parsed = signupSchema.safeParse(body);

		if (!parsed.success) {
			const firstError = parsed.error.issues[0];
			return NextResponse.json(
				{ error: firstError?.message || "Invalid input" },
				{ status: 400 }
			);
		}

		const { orgName, email, password } = parsed.data;
		const normalizedEmail = email.toLowerCase().trim();

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: normalizedEmail },
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 400 }
			);
		}

		// Hash password
		const passwordHash = await hash(password, 12);

		// Generate shared secret for webhook signing
		const sharedSecret = randomBytes(32).toString("hex");

		// Create tenant and user in a transaction
		const result = await prisma.$transaction(async (tx) => {
			// Create tenant
			const tenant = await tx.tenant.create({
				data: {
					name: orgName,
					sharedSecret,
					plan: "free",
				},
			});

			// Create user as owner
			const user = await tx.user.create({
				data: {
					tenantId: tenant.id,
					email: normalizedEmail,
					passwordHash,
					role: "owner",
				},
			});

			return { tenant, user };
		});

		return NextResponse.json({
			success: true,
			message: "Account created successfully",
			userId: result.user.id,
		});
	} catch (err) {
		console.error("Signup error:", err);
		return NextResponse.json(
			{ error: "Failed to create account. Please try again." },
			{ status: 500 }
		);
	}
}

