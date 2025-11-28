import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { defaultTheme, type ThemeConfig } from '@/types/theme';

export const dynamic = 'force-dynamic';

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	try {
		const { publicId } = await context.params;
		const form = await prisma.form.findUnique({
			where: { publicId },
			include: {
				currentVersion: true,
				tenant: {
					select: {
						id: true,
						settings: true,
					},
				},
			},
		});

		if (!form || form.status === 'archived') {
			return NextResponse.json({ error: 'Form not found' }, { status: 404 });
		}

		// Resolve version: prefer currentVersion, otherwise highest versionNumber
		let version = form.currentVersion;
		if (!version) {
			version = await prisma.formVersion.findFirst({
				where: { formId: form.id },
				orderBy: { versionNumber: 'desc' },
			});
		}

		if (!version) {
			return NextResponse.json({ error: 'Form has no versions' }, { status: 404 });
		}

		// Get theme from tenant settings or use default
		const tenantSettings = form.tenant.settings as { theme?: Partial<ThemeConfig> } | null;
		const theme = tenantSettings?.theme
			? { ...defaultTheme, ...tenantSettings.theme }
			: defaultTheme;

		const settings = {
			showProgressBar: true,
			showStepNumbers: true,
		};

		return NextResponse.json({
			formId: form.id,
			formVersion: version.versionNumber,
			schema: version.schema,
			theme,
			settings,
		});
	} catch {
		// Do not leak stack traces
		return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
 	}
}


