import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { defaultTheme, type ThemeConfig } from '@/types/theme';
import { selectVersion, type VersionWeight } from '@/lib/ab-testing';

export const dynamic = 'force-dynamic';

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ publicId: string }> }
) {
	try {
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
						schema: true,
					},
				},
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

		// Check for A/B test
		const abVersions: VersionWeight[] = form.versions
			.filter((v) => v.trafficWeight > 0)
			.map((v) => ({
				versionId: v.id,
				versionNumber: v.versionNumber,
				weight: v.trafficWeight,
			}));

		let version = form.currentVersion;

		// If A/B test is active, select version based on weights
		if (abVersions.length > 0) {
			const selectedId = selectVersion(abVersions, form.currentVersionId);
			if (selectedId) {
				version = form.versions.find((v) => v.id === selectedId) ?? version;
			}
		}

		// Fallback to highest version if no current version
		if (!version) {
			version = form.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
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
			thankYouUrl: form.thankYouUrl,
			thankYouMessage: form.thankYouMessage,
		});
	} catch {
		// Do not leak stack traces
		return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
 	}
}


