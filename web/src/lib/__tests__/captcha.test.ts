/**
 * Captcha verification tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken, isTurnstileEnabled } from '../captcha';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('verifyTurnstileToken', () => {
	beforeEach(() => {
		vi.resetModules();
		mockFetch.mockReset();
		delete process.env.TURNSTILE_SECRET_KEY;
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('returns success when Turnstile not configured (dev mode)', async () => {
		const result = await verifyTurnstileToken('some-token');
		expect(result.success).toBe(true);
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns failure for empty token', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		const result = await verifyTurnstileToken('');
		expect(result.success).toBe(false);
		expect(result.errorCodes).toContain('missing-input-response');
	});

	it('returns failure for null token', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		const result = await verifyTurnstileToken(null as any);
		expect(result.success).toBe(false);
		expect(result.errorCodes).toContain('missing-input-response');
	});

	it('verifies valid token successfully', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				challenge_ts: '2024-01-01T00:00:00Z',
				hostname: 'example.com',
			}),
		});

		const result = await verifyTurnstileToken('valid-token', '1.2.3.4');
		
		expect(result.success).toBe(true);
		expect(mockFetch).toHaveBeenCalledWith(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			expect.objectContaining({
				method: 'POST',
			})
		);
	});

	it('returns failure for invalid token', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: false,
				'error-codes': ['invalid-input-response'],
			}),
		});

		const result = await verifyTurnstileToken('invalid-token');
		
		expect(result.success).toBe(false);
		expect(result.errorCodes).toContain('invalid-input-response');
	});

	it('fails open on network error', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const result = await verifyTurnstileToken('some-token');
		
		// Should fail open to not block legitimate users
		expect(result.success).toBe(true);
	});

	it('returns failure on HTTP error', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'test-secret';
		
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
		});

		const result = await verifyTurnstileToken('some-token');
		
		expect(result.success).toBe(false);
		expect(result.errorCodes).toContain('http-error');
	});
});

describe('isTurnstileEnabled', () => {
	beforeEach(() => {
		delete process.env.TURNSTILE_SECRET_KEY;
		delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
	});

	it('returns false when not configured', () => {
		expect(isTurnstileEnabled()).toBe(false);
	});

	it('returns false when only secret key set', () => {
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		expect(isTurnstileEnabled()).toBe(false);
	});

	it('returns false when only site key set', () => {
		process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key';
		expect(isTurnstileEnabled()).toBe(false);
	});

	it('returns true when both keys set', () => {
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key';
		expect(isTurnstileEnabled()).toBe(true);
	});
});
