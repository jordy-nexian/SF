import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	const { publicId } = await context.params;
	
	// Find the form with all related data
	const form = await prisma.form.findUnique({
		where: { publicId },
		include: {
			currentVersion: true,
			versions: {
				select: {
					id: true,
					versionNumber: true,
					trafficWeight: true,
					schema: true,
				},
			},
			tenant: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	if (!form) {
		// Check if any form exists with similar publicId
		const allForms = await prisma.form.findMany({
			select: {
				id: true,
				publicId: true,
				name: true,
				status: true,
			},
			take: 10,
		});

		return NextResponse.json({
			error: 'Form not found',
			searchedFor: publicId,
			existingForms: allForms.map(f => ({
				publicId: f.publicId,
				name: f.name,
				status: f.status,
			})),
		}, { status: 404 });
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
				hasSchema: !!v.schema,
				schemaPreview: v.schema ? JSON.stringify(v.schema).substring(0, 200) + '...' : null,
			})),
			tenant: form.tenant,
		},
	});
}



