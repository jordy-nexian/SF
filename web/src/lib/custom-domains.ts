/**
 * Custom domain support for forms.
 * Allows tenants to use their own domain for form hosting.
 */

import prisma from "@/lib/prisma";

/**
 * Lookup tenant by custom domain.
 */
export async function getTenantByDomain(domain: string) {
	return prisma.tenant.findFirst({
		where: {
			customDomain: domain.toLowerCase(),
			customDomainVerified: true,
		},
		select: {
			id: true,
			name: true,
			settings: true,
		},
	});
}

/**
 * Generate DNS verification record.
 * Returns a TXT record that should be added to the domain.
 */
export function generateVerificationRecord(tenantId: string): string {
	// Create a deterministic verification code based on tenant ID
	const code = Buffer.from(`stateless-forms:${tenantId}`)
		.toString("base64")
		.replace(/[^a-zA-Z0-9]/g, "")
		.slice(0, 32);
	return `stateless-forms-verify=${code}`;
}

/**
 * Verify custom domain ownership via DNS TXT record.
 */
export async function verifyDomain(
	domain: string,
	tenantId: string
): Promise<{ verified: boolean; error?: string }> {
	try {
		const dns = await import("node:dns").then((m) => m.promises);
		const expectedRecord = generateVerificationRecord(tenantId);

		// Lookup TXT records
		const records = await dns.resolveTxt(domain);
		const flatRecords = records.flat();

		// Check if any record matches
		const found = flatRecords.some((r) => r === expectedRecord);

		if (found) {
			return { verified: true };
		}

		return {
			verified: false,
			error: `TXT record not found. Add: ${expectedRecord}`,
		};
	} catch (err) {
		return {
			verified: false,
			error: `DNS lookup failed: ${err instanceof Error ? err.message : "Unknown error"}`,
		};
	}
}

/**
 * Set custom domain for a tenant.
 */
export async function setCustomDomain(
	tenantId: string,
	domain: string | null
): Promise<{ success: boolean; error?: string }> {
	if (!domain) {
		// Remove custom domain
		await prisma.tenant.update({
			where: { id: tenantId },
			data: {
				customDomain: null,
				customDomainVerified: false,
			},
		});
		return { success: true };
	}

	// Normalize domain
	const normalizedDomain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

	// Check if domain is already in use
	const existing = await prisma.tenant.findFirst({
		where: {
			customDomain: normalizedDomain,
			id: { not: tenantId },
		},
	});

	if (existing) {
		return { success: false, error: "Domain is already in use" };
	}

	// Set domain (unverified)
	await prisma.tenant.update({
		where: { id: tenantId },
		data: {
			customDomain: normalizedDomain,
			customDomainVerified: false,
		},
	});

	return { success: true };
}

/**
 * Mark domain as verified.
 */
export async function markDomainVerified(tenantId: string): Promise<void> {
	await prisma.tenant.update({
		where: { id: tenantId },
		data: { customDomainVerified: true },
	});
}






