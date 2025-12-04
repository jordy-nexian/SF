/**
 * IP allowlist/blocklist validation for form submissions.
 */

export type IpRule = {
	type: "allow" | "block";
	pattern: string; // IP address, CIDR, or "*" for all
	description?: string;
};

export type IpAllowlistConfig = {
	mode: "allowlist" | "blocklist" | "disabled";
	rules: IpRule[];
};

/**
 * Check if an IP matches a pattern.
 * Supports exact match, CIDR notation, and wildcards.
 */
function matchIp(ip: string, pattern: string): boolean {
	if (pattern === "*") return true;

	// Exact match
	if (ip === pattern) return true;

	// CIDR match (simplified - IPv4 only for now)
	if (pattern.includes("/")) {
		const [network, bits] = pattern.split("/");
		const mask = parseInt(bits, 10);
		if (isNaN(mask) || mask < 0 || mask > 32) return false;

		const ipNum = ipToNumber(ip);
		const networkNum = ipToNumber(network);
		if (ipNum === null || networkNum === null) return false;

		const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;
		return (ipNum & maskNum) === (networkNum & maskNum);
	}

	// Wildcard match (e.g., "192.168.*.*")
	if (pattern.includes("*")) {
		const regex = new RegExp(
			"^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "\\d+") + "$"
		);
		return regex.test(ip);
	}

	return false;
}

/**
 * Convert IPv4 address to number.
 */
function ipToNumber(ip: string): number | null {
	const parts = ip.split(".");
	if (parts.length !== 4) return null;

	let num = 0;
	for (const part of parts) {
		const n = parseInt(part, 10);
		if (isNaN(n) || n < 0 || n > 255) return null;
		num = (num << 8) | n;
	}
	return num >>> 0;
}

/**
 * Check if an IP is allowed based on the configuration.
 */
export function isIpAllowed(
	ip: string | null,
	config: IpAllowlistConfig | null | undefined
): { allowed: boolean; reason?: string } {
	// No config or disabled = allow all
	if (!config || config.mode === "disabled") {
		return { allowed: true };
	}

	// No IP = can't validate, default to allow
	if (!ip) {
		return { allowed: true, reason: "No IP to validate" };
	}

	const { mode, rules } = config;

	if (mode === "allowlist") {
		// In allowlist mode, IP must match at least one allow rule
		const matched = rules.some(
			(rule) => rule.type === "allow" && matchIp(ip, rule.pattern)
		);
		if (!matched) {
			return { allowed: false, reason: "IP not in allowlist" };
		}
		return { allowed: true };
	}

	if (mode === "blocklist") {
		// In blocklist mode, IP must not match any block rule
		const blocked = rules.find(
			(rule) => rule.type === "block" && matchIp(ip, rule.pattern)
		);
		if (blocked) {
			return { allowed: false, reason: blocked.description || "IP blocked" };
		}
		return { allowed: true };
	}

	return { allowed: true };
}

/**
 * Validate IP allowlist configuration.
 */
export function validateIpAllowlistConfig(
	config: unknown
): { valid: boolean; error?: string } {
	if (!config || typeof config !== "object") {
		return { valid: true }; // Empty config is valid
	}

	const cfg = config as IpAllowlistConfig;

	if (!["allowlist", "blocklist", "disabled"].includes(cfg.mode)) {
		return { valid: false, error: "Invalid mode" };
	}

	if (!Array.isArray(cfg.rules)) {
		return { valid: false, error: "rules must be an array" };
	}

	for (let i = 0; i < cfg.rules.length; i++) {
		const rule = cfg.rules[i];
		if (!["allow", "block"].includes(rule.type)) {
			return { valid: false, error: `Rule ${i}: invalid type` };
		}
		if (!rule.pattern || typeof rule.pattern !== "string") {
			return { valid: false, error: `Rule ${i}: invalid pattern` };
		}
	}

	return { valid: true };
}





