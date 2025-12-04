/**
 * Simple in-memory rate limiter for serverless environments.
 * Uses a sliding window approach with automatic cleanup.
 *
 * Note: In a multi-instance deployment, consider using Redis or
 * Vercel's Edge Config for distributed rate limiting.
 */

type RateLimitEntry = {
	count: number;
	resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;
	for (const [key, entry] of store.entries()) {
		if (entry.resetAt < now) {
			store.delete(key);
		}
	}
}

export type RateLimitConfig = {
	/** Maximum requests allowed in the window */
	limit: number;
	/** Window duration in milliseconds */
	windowMs: number;
};

export type RateLimitResult = {
	success: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
};

/**
 * Check and consume rate limit for a given key.
 * @param key Unique identifier (e.g., IP address, tenant ID)
 * @param config Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
	cleanup();

	const now = Date.now();
	const entry = store.get(key);

	// No existing entry or window expired
	if (!entry || entry.resetAt < now) {
		const resetAt = now + config.windowMs;
		store.set(key, { count: 1, resetAt });
		return {
			success: true,
			limit: config.limit,
			remaining: config.limit - 1,
			resetAt,
		};
	}

	// Within window
	if (entry.count < config.limit) {
		entry.count++;
		return {
			success: true,
			limit: config.limit,
			remaining: config.limit - entry.count,
			resetAt: entry.resetAt,
		};
	}

	// Rate limited
	return {
		success: false,
		limit: config.limit,
		remaining: 0,
		resetAt: entry.resetAt,
	};
}

/**
 * Extract client IP from request headers.
 * Handles Vercel's x-forwarded-for and x-real-ip headers.
 */
export function getClientIp(headers: Headers): string {
	const xff = headers.get("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	const realIp = headers.get("x-real-ip");
	if (realIp) return realIp;
	return "unknown";
}

// Default rate limit configurations
export const RATE_LIMITS = {
	/** Public form submission: 30 requests per minute per IP */
	submit: { limit: 30, windowMs: 60_000 },
	/** Form fetch: 60 requests per minute per IP */
	formFetch: { limit: 60, windowMs: 60_000 },
	/** Auth attempts: 5 per minute per IP */
	auth: { limit: 5, windowMs: 60_000 },
} as const;



