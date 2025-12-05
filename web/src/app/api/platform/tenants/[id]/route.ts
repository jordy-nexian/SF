import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/platform-auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

	return NextResponse.json(tenant);
}

// DELETE tenant
export async function DELETE(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const session = await requirePlatformAdmin();
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
	}

	const { id } = await context.params;

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

	return NextResponse.json({ success: true });
}






