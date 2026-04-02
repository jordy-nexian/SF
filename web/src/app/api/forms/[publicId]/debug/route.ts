import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	// Block entirely in production
	if (process.env.NODE_ENV === 'production') {
		return NextResponse.json({ error: 'Not available' }, { status: 404 });
	}

	// Require admin auth in all other environments
	const session = await requireTenantSession();
	if (!session) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const { publicId } = await context.params;

	const form = await prisma.form.findUnique({
		where: { publicId },
		include: {
			currentVersion: true,
			versions: {
				select: {
					id: true,
					versionNumber: true,
					trafficWeight: true,
				},
			},
		},
	});

	if (!form) {
		return NextResponse.json({ error: 'Form not found' }, { status: 404 });
	}

	// Only return data for the caller's own tenant
	if (form.tenantId !== session.tenantId) {
		return NextResponse.json({ error: 'Form not found' }, { status: 404 });
	}

	return NextResponse.json({
		found: true,
		form: {
			id: form.id,
			publicId: form.publicId,
			name: form.name,
			status: form.status,
			currentVersionId: form.currentVersionId,
			hasCurrentVersion: !!form.currentVersion,
			versionsCount: form.versions.length,
			versions: form.versions.map(v => ({
				id: v.id,
				versionNumber: v.versionNumber,
				trafficWeight: v.trafficWeight,
			})),
		},
	});
}
