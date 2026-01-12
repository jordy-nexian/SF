/**
 * Rate limit tests
 * 
 * Note: These tests focus on the getClientIp helper and basic behavior.
 * Full rate limiting integration tests require a real Upstash Redis instance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientIp, RATE_LIMITS } from '../rate-limit';

describe('RATE_LIMITS configuration', () => {
	it('has submit rate limit configured', () => {
		expect(RATE_LIMITS.submit).toBeDefined();
		expect(RATE_LIMITS.submit.limit).toBe(30);
		expect(RATE_LIMITS.submit.windowMs).toBe(60000);
	});
});

describe('getClientIp', () => {
	it('extracts IP from x-forwarded-for header', () => {
		const headers = new Headers();
		headers.set('x-forwarded-for', '1.2.3.4, 5.6.7.8');
		
		expect(getClientIp(headers)).toBe('1.2.3.4');
	});

	it('extracts IP from x-real-ip header', () => {
		const headers = new Headers();
		headers.set('x-real-ip', '1.2.3.4');
		
		expect(getClientIp(headers)).toBe('1.2.3.4');
	});

	it('returns unknown when no IP headers', () => {
		const headers = new Headers();
		
		expect(getClientIp(headers)).toBe('unknown');
	});

	it('prefers x-forwarded-for over x-real-ip', () => {
		const headers = new Headers();
		headers.set('x-forwarded-for', '1.1.1.1');
		headers.set('x-real-ip', '2.2.2.2');
		
		expect(getClientIp(headers)).toBe('1.1.1.1');
	});

	it('handles empty x-forwarded-for', () => {
		const headers = new Headers();
		headers.set('x-forwarded-for', '');
		headers.set('x-real-ip', '2.2.2.2');
		
		expect(getClientIp(headers)).toBe('2.2.2.2');
	});

	it('trims whitespace from IP', () => {
		const headers = new Headers();
		headers.set('x-forwarded-for', '  1.2.3.4  , 5.6.7.8');
		
		expect(getClientIp(headers)).toBe('1.2.3.4');
	});
});

describe('rateLimit function', () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.UPSTASH_REDIS_REST_URL;
		delete process.env.UPSTASH_REDIS_REST_TOKEN;
	});

	it('returns success when Redis not configured (fail open)', async () => {
		// Import fresh to ensure no cached Redis client
		const { rateLimit } = await import('../rate-limit');
		
		const result = await rateLimit('test-key', RATE_LIMITS.submit);
		
		expect(result.success).toBe(true);
		expect(result.limit).toBe(30);
		expect(result.remaining).toBe(30);
	});
});
