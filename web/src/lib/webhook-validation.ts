/**
 * Webhook URL validation to prevent SSRF attacks.
 * Blocks internal/private IP ranges and restricts to HTTPS.
 */

import { URL } from "url";

// Private/internal IP ranges that should be blocked
const BLOCKED_IP_PATTERNS = [
	/^127\./, // Loopback
	/^10\./, // Private Class A
	/^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
	/^192\.168\./, // Private Class C
	/^169\.254\./, // Link-local
	/^0\./, // Current network
	/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Carrier-grade NAT
	/^192\.0\.0\./, // IETF Protocol Assignments
	/^192\.0\.2\./, // TEST-NET-1
	/^198\.51\.100\./, // TEST-NET-2
	/^203\.0\.113\./, // TEST-NET-3
	/^224\./, // Multicast
	/^240\./, // Reserved
	/^255\./, // Broadcast
	/^::1$/, // IPv6 loopback
	/^fc00:/, // IPv6 unique local
	/^fe80:/, // IPv6 link-local
	/^ff00:/, // IPv6 multicast
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"[::1]",
	"metadata.google.internal", // GCP metadata
	"169.254.169.254", // AWS/GCP/Azure metadata
	"metadata.azure.com",
	"metadata.google.com",
];

// Allowed URL schemes
const ALLOWED_SCHEMES = ["https:"];

// Optional: Allowlist of webhook domains (if empty, all non-blocked domains allowed)
// Set via environment variable: WEBHOOK_ALLOWLIST=n8n.example.com,hooks.zapier.com
const WEBHOOK_ALLOWLIST = process.env.WEBHOOK_ALLOWLIST
	? process.env.WEBHOOK_ALLOWLIST.split(",").map((d) => d.trim().toLowerCase())
	: [];

export type WebhookValidationResult = {
	valid: boolean;
	error?: string;
	normalizedUrl?: string;
};

/**
 * Validate a webhook URL for security.
 * @param urlString The URL to validate
 * @returns Validation result with error message if invalid
 */
export function validateWebhookUrl(urlString: string): WebhookValidationResult {
	if (!urlString || typeof urlString !== "string") {
		return { valid: false, error: "Webhook URL is required" };
	}

	let url: URL;
	try {
		url = new URL(urlString.trim());
	} catch {
		return { valid: false, error: "Invalid URL format" };
	}

	// Check scheme (HTTPS only in production)
	if (process.env.NODE_ENV === "production") {
		if (!ALLOWED_SCHEMES.includes(url.protocol)) {
			return { valid: false, error: "Webhook URL must use HTTPS" };
		}
	} else {
		// Allow HTTP in development
		if (!["https:", "http:"].includes(url.protocol)) {
			return { valid: false, error: "Webhook URL must use HTTP or HTTPS" };
		}
	}

	// Check blocked hostnames
	const hostname = url.hostname.toLowerCase();
	if (BLOCKED_HOSTNAMES.includes(hostname)) {
		return { valid: false, error: "Webhook URL hostname is not allowed" };
	}

	// Check if hostname looks like an IP address and validate
	const ipMatch = hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/);
	if (ipMatch) {
		for (const pattern of BLOCKED_IP_PATTERNS) {
			if (pattern.test(hostname)) {
				return { valid: false, error: "Webhook URL cannot use private/internal IP addresses" };
			}
		}
	}

	// Check allowlist if configured
	if (WEBHOOK_ALLOWLIST.length > 0) {
		const isAllowed = WEBHOOK_ALLOWLIST.some(
			(allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
		);
		if (!isAllowed) {
			return {
				valid: false,
				error: `Webhook URL domain not in allowlist. Allowed: ${WEBHOOK_ALLOWLIST.join(", ")}`,
			};
		}
	}

	// Normalize URL (remove trailing slash for consistency)
	const normalizedUrl = url.toString().replace(/\/$/, "");

	return { valid: true, normalizedUrl };
}

/**
 * Quick check if a URL is valid for webhook use.
 */
export function isValidWebhookUrl(urlString: string): boolean {
	return validateWebhookUrl(urlString).valid;
}



