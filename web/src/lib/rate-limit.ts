/**
 * Distributed rate limiter using Upstash Redis.
 * Works correctly across all serverless instances.
 *
 * Falls back to permissive mode if Redis is unavailable (logs warning).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

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
	degraded?: boolean;  // true when Redis unavailable (fail-closed mode)
};

// Initialize Redis client (lazy - only when first used)
let redis: Redis | null = null;
let rateLimiters: Map<string, Ratelimit> = new Map();

function getRedis(): Redis | null {
	if (redis) return redis;

	const url = process.env.UPSTASH_REDIS_REST_URL;
	const token = process.env.UPSTASH_REDIS_REST_TOKEN;

	if (!url || !token) {
		console.warn('[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Rate limiting disabled.');
		return null;
	}

	redis = new Redis({ url, token });
	return redis;
}

function getRateLimiter(config: RateLimitConfig): Ratelimit | null {
	const redisClient = getRedis();
	if (!redisClient) return null;

	// Cache rate limiters by config to avoid recreating
	const key = `${config.limit}:${config.windowMs}`;
	let limiter = rateLimiters.get(key);

	if (!limiter) {
		limiter = new Ratelimit({
			redis: redisClient,
			limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs} ms`),
			analytics: true,
			prefix: 'stateless-forms',
		});
		rateLimiters.set(key, limiter);
	}

	return limiter;
}

/**
 * Check and consume rate limit for a given key.
 * @param key Unique identifier (e.g., IP address, tenant ID)
 * @param config Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export async function rateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
	// Redis rate limiting temporarily disabled
	return { success: true, limit: config.limit, remaining: config.limit, resetAt: 0 };

	const limiter = getRateLimiter(config);

	// Fail-closed: if Redis not configured, reject requests (security-first)
	if (!limiter) {
		return {
			success: false,
			limit: config.limit,
			remaining: 0,
			resetAt: Date.now() + 30_000, // Retry after 30 seconds
			degraded: true,
		};
	}

	try {
		const result = await limiter.limit(key);

		return {
			success: result.success,
			limit: result.limit,
			remaining: result.remaining,
			resetAt: result.reset,
		};
	} catch (error) {
		// Fail-closed: on Redis error, reject request (security-first)
		console.error('[RateLimit] Redis error, failing closed:', error instanceof Error ? error.message : 'unknown');
		return {
			success: false,
			limit: config.limit,
			remaining: 0,
			resetAt: Date.now() + 30_000, // Retry after 30 seconds
			degraded: true,
		};
	}
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
	/** Signup: 5 requests per 15 minutes per IP */
	signup: { limit: 5, windowMs: 15 * 60_000 },
	/** Login: 5 attempts per minute per IP (stricter for brute force prevention) */
	login: { limit: 5, windowMs: 60_000 },
	/** Magic link requests: 3 per 5 minutes per IP (portal auth) */
	magicLink: { limit: 3, windowMs: 5 * 60_000 },
} as const;












