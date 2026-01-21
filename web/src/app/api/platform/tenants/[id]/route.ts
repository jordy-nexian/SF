import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { logPlatformAudit } from "@/lib/platform-audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Helper to extract IP and user agent from request
function getRequestContext(req: NextRequest) {
	const xff = req.headers.get("x-forwarded-for");
	const ipAddress = xff ? xff.split(",")[0]?.trim() : req.headers.get("x-real-ip") || undefined;
	const userAgent = req.headers.get("user-agent") || undefined;
	return { ipAddress, userAgent };
}

// GET tenant detail
export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requirePlatformAdmin();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { id } = await context.params;
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const tenant = await prisma.tenant.findUnique({
		where: { id },
		include: {
			users: {
				select: {
					id: true,
					email: true,
					role: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'asc' },
			},
			forms: {
				select: {
					id: true,
					name: true,
					publicId: true,
					status: true,
					updatedAt: true,
				},
				orderBy: { updatedAt: 'desc' },
			},
		},
	});

	if (!tenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	// Get submission counts
	const [submissionsThisMonth, submissionsTotal, recentSubmissions] = await Promise.all([
		prisma.submissionEvent.count({
			where: { tenantId: id, submittedAt: { gte: startOfMonth } },
		}),
		prisma.submissionEvent.count({
			where: { tenantId: id },
		}),
		prisma.submissionEvent.findMany({
			where: { tenantId: id },
			take: 10,
			orderBy: { submittedAt: 'desc' },
			select: {
				id: true,
				formId: true,
				submittedAt: true,
				durationMs: true,
				form: { select: { name: true } },
			},
		}),
	]);

	return NextResponse.json({
		...tenant,
		usage: {
			forms: tenant.forms.length,
			submissionsThisMonth,
			submissionsTotal,
		},
		recentSubmissions: recentSubmissions.map(s => ({
			...s,
			formName: s.form?.name || 'Unknown',
		})),
	});
}

const updateSchema = z.object({
	plan: z.enum(['free', 'pro', 'enterprise']).optional(),
	subscriptionStatus: z.enum(['none', 'active', 'past_due', 'canceled', 'trialing']).optional(),
});

// PUT update tenant
export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requirePlatformAdmin();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { id } = await context.params;
	const body = await req.json().catch(() => ({}));
	const parsed = updateSchema.safeParse(body);

	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	// Get current tenant state for audit log
	const existingTenant = await prisma.tenant.findUnique({
		where: { id },
		select: { name: true, plan: true, subscriptionStatus: true },
	});

	const tenant = await prisma.tenant.update({
		where: { id },
		data: parsed.data,
		include: {
			users: {
				select: {
					id: true,
					email: true,
					role: true,
					createdAt: true,
				},
			},
			forms: {
				select: {
					id: true,
					name: true,
					publicId: true,
					status: true,
					updatedAt: true,
				},
			},
		},
	});

	// Audit log the update
	const { ipAddress, userAgent } = getRequestContext(req);
	if (parsed.data.plan) {
		await logPlatformAudit({
			adminEmail: session.email,
			action: "tenant.plan.updated",
			targetType: "tenant",
			targetId: id,
			metadata: {
				tenantName: existingTenant?.name,
				oldPlan: existingTenant?.plan,
				newPlan: parsed.data.plan,
			},
			ipAddress,
			userAgent,
		});
	}
	if (parsed.data.subscriptionStatus) {
		await logPlatformAudit({
			adminEmail: session.email,
			action: "tenant.status.updated",
			targetType: "tenant",
			targetId: id,
			metadata: {
				tenantName: existingTenant?.name,
				oldStatus: existingTenant?.subscriptionStatus,
				newStatus: parsed.data.subscriptionStatus,
			},
			ipAddress,
			userAgent,
		});
	}

	return NextResponse.json(tenant);
}

// DELETE tenant
export async function DELETE(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requirePlatformAdmin();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { id } = await context.params;

	// Get tenant info for audit log before deletion
	const tenantToDelete = await prisma.tenant.findUnique({
		where: { id },
		select: {
			name: true,
			plan: true,
			_count: { select: { users: true, forms: true } },
		},
	});

	// Delete in order: submissions, form versions, forms, users, themes, audit logs, tenant
	await prisma.$transaction([
		prisma.submissionEvent.deleteMany({ where: { tenantId: id } }),
		prisma.formVersion.deleteMany({
			where: { form: { tenantId: id } }
		}),
		prisma.form.deleteMany({ where: { tenantId: id } }),
		prisma.user.deleteMany({ where: { tenantId: id } }),
		prisma.theme.deleteMany({ where: { tenantId: id } }),
		prisma.auditLog.deleteMany({ where: { tenantId: id } }),
		prisma.tenant.delete({ where: { id } }),
	]);

	// Audit log the deletion (after successful transaction)
	const { ipAddress, userAgent } = getRequestContext(req);
	await logPlatformAudit({
		adminEmail: session.email,
		action: "tenant.deleted",
		targetType: "tenant",
		targetId: id,
		metadata: {
			tenantName: tenantToDelete?.name,
			tenantPlan: tenantToDelete?.plan,
			userCount: tenantToDelete?._count?.users,
			formCount: tenantToDelete?._count?.forms,
		},
		ipAddress,
		userAgent,
	});

	return NextResponse.json({ success: true });
}












