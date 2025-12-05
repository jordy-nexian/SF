/**
 * A/B testing logic for form versions.
 * Assigns users to versions based on traffic weights.
 */

export type VersionWeight = {
	versionId: string;
	versionNumber: number;
	weight: number; // 0-100
};

/**
 * Select a version based on traffic weights using weighted random selection.
 * Returns the version ID to use.
 */
export function selectVersion(
	versions: VersionWeight[],
	defaultVersionId?: string | null
): string | null {
	// Filter versions with weight > 0
	const activeVersions = versions.filter((v) => v.weight > 0);

	// If no A/B test configured, return default
	if (activeVersions.length === 0) {
		return defaultVersionId ?? null;
	}

	// Calculate total weight
	const totalWeight = activeVersions.reduce((sum, v) => sum + v.weight, 0);

	if (totalWeight === 0) {
		return defaultVersionId ?? null;
	}

	// Generate random number between 0 and totalWeight
	const random = Math.random() * totalWeight;

	// Select version based on cumulative weight
	let cumulative = 0;
	for (const version of activeVersions) {
		cumulative += version.weight;
		if (random < cumulative) {
			return version.versionId;
		}
	}

	// Fallback to last version (shouldn't happen)
	return activeVersions[activeVersions.length - 1].versionId;
}

/**
 * Get a consistent version for a user based on their identifier.
 * Uses a hash to ensure the same user always sees the same version.
 */
export function selectVersionConsistent(
	versions: VersionWeight[],
	userId: string,
	defaultVersionId?: string | null
): string | null {
	const activeVersions = versions.filter((v) => v.weight > 0);

	if (activeVersions.length === 0) {
		return defaultVersionId ?? null;
	}

	const totalWeight = activeVersions.reduce((sum, v) => sum + v.weight, 0);

	if (totalWeight === 0) {
		return defaultVersionId ?? null;
	}

	// Generate a deterministic "random" number from the userId
	const hash = simpleHash(userId);
	const bucket = hash % totalWeight;

	let cumulative = 0;
	for (const version of activeVersions) {
		cumulative += version.weight;
		if (bucket < cumulative) {
			return version.versionId;
		}
	}

	return activeVersions[activeVersions.length - 1].versionId;
}

/**
 * Simple string hash function.
 */
function simpleHash(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash);
}

/**
 * Validate A/B test weights.
 * Weights should sum to 100 if any are non-zero.
 */
export function validateWeights(
	versions: VersionWeight[]
): { valid: boolean; error?: string } {
	const activeVersions = versions.filter((v) => v.weight > 0);

	if (activeVersions.length === 0) {
		return { valid: true }; // No A/B test
	}

	const totalWeight = activeVersions.reduce((sum, v) => sum + v.weight, 0);

	if (totalWeight !== 100) {
		return {
			valid: false,
			error: `Weights must sum to 100 (currently ${totalWeight})`,
		};
	}

	for (const v of activeVersions) {
		if (v.weight < 0 || v.weight > 100) {
			return { valid: false, error: "Weights must be between 0 and 100" };
		}
	}

	return { valid: true };
}






