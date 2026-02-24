/**
 * HMAC signature tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { createHmacSignature, buildSignatureHeaders, verifyHmacSignature, extractSignatureHeaders, type HmacHeader } from '../hmac';

describe('createHmacSignature', () => {
	const mockDate = new Date('2024-01-15T10:30:00.000Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(mockDate);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates a valid HMAC signature', () => {
		const payload = JSON.stringify({ test: 'data' });
		const secret = 'my-secret-key';

		const result = createHmacSignature(payload, secret);

		expect(result).toHaveProperty('signature');
		expect(result).toHaveProperty('timestamp');
		expect(result).toHaveProperty('algorithm');
		expect(result.algorithm).toBe('sha256');
	});

	it('includes current timestamp', () => {
		const payload = 'test-payload';
		const secret = 'secret';

		const result = createHmacSignature(payload, secret);

		expect(result.timestamp).toBe('2024-01-15T10:30:00.000Z');
	});

	it('generates hex-encoded signature', () => {
		const payload = 'test';
		const secret = 'secret';

		const result = createHmacSignature(payload, secret);

		// Hex string should only contain 0-9 and a-f
		expect(result.signature).toMatch(/^[0-9a-f]+$/);
		// SHA-256 produces 64 hex characters
		expect(result.signature.length).toBe(64);
	});

	it('produces consistent signatures for same inputs', () => {
		const payload = 'consistent-payload';
		const secret = 'consistent-secret';

		const result1 = createHmacSignature(payload, secret);
		const result2 = createHmacSignature(payload, secret);

		// Same timestamp + payload + secret = same signature
		expect(result1.signature).toBe(result2.signature);
	});

	it('produces different signatures for different payloads', () => {
		const secret = 'same-secret';

		const result1 = createHmacSignature('payload1', secret);
		const result2 = createHmacSignature('payload2', secret);

		expect(result1.signature).not.toBe(result2.signature);
	});

	it('produces different signatures for different secrets', () => {
		const payload = 'same-payload';

		const result1 = createHmacSignature(payload, 'secret1');
		const result2 = createHmacSignature(payload, 'secret2');

		expect(result1.signature).not.toBe(result2.signature);
	});

	it('can be verified with Node crypto', () => {
		const payload = 'verify-test';
		const secret = 'verify-secret';

		const result = createHmacSignature(payload, secret);

		// Recreate the signature manually to verify
		const hmac = crypto.createHmac('sha256', secret);
		hmac.update(result.timestamp + '.' + payload, 'utf8');
		const expectedSignature = hmac.digest('hex');

		expect(result.signature).toBe(expectedSignature);
	});
});

describe('buildSignatureHeaders', () => {
	it('builds correct header object', () => {
		const hmacHeader: HmacHeader = {
			signature: 'abc123def456',
			timestamp: '2024-01-15T10:30:00.000Z',
			algorithm: 'sha256',
		};

		const headers = buildSignatureHeaders(hmacHeader);

		expect(headers).toEqual({
			'X-Form-Signature': 'abc123def456',
			'X-Form-Signature-Alg': 'sha256',
			'X-Form-Signature-Ts': '2024-01-15T10:30:00.000Z',
		});
	});

	it('returns object with exactly 3 headers', () => {
		const hmacHeader: HmacHeader = {
			signature: 'sig',
			timestamp: 'ts',
			algorithm: 'sha256',
		};

		const headers = buildSignatureHeaders(hmacHeader);

		expect(Object.keys(headers)).toHaveLength(3);
	});
});

describe('HMAC integration', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('creates signature and headers in one flow', () => {
		const payload = JSON.stringify({ formId: 'abc', answers: { name: 'Test' } });
		const secret = 'webhook-secret';

		const hmacHeader = createHmacSignature(payload, secret);
		const headers = buildSignatureHeaders(hmacHeader);

		// Headers should be usable in fetch
		expect(headers['X-Form-Signature']).toBeDefined();
		expect(headers['X-Form-Signature-Alg']).toBe('sha256');
		expect(headers['X-Form-Signature-Ts']).toBeDefined();

		// Receiver can verify the signature
		const hmac = crypto.createHmac('sha256', secret);
		hmac.update(headers['X-Form-Signature-Ts'] + '.' + payload, 'utf8');
		const expectedSignature = hmac.digest('hex');

		expect(headers['X-Form-Signature']).toBe(expectedSignature);
	});
});

describe('extractSignatureHeaders', () => {
	it('extracts all three headers from a Response', () => {
		const response = new Response('body', {
			headers: {
				'X-Form-Signature': 'sig123',
				'X-Form-Signature-Alg': 'sha256',
				'X-Form-Signature-Ts': '2024-01-15T10:30:00.000Z',
			},
		});
		expect(extractSignatureHeaders(response)).toEqual({
			signature: 'sig123',
			algorithm: 'sha256',
			timestamp: '2024-01-15T10:30:00.000Z',
		});
	});

	it('returns null when signature header is missing', () => {
		const response = new Response('body', {
			headers: {
				'X-Form-Signature-Alg': 'sha256',
				'X-Form-Signature-Ts': '2024-01-15T10:30:00.000Z',
			},
		});
		expect(extractSignatureHeaders(response)).toBeNull();
	});

	it('returns null when algorithm header is missing', () => {
		const response = new Response('body', {
			headers: {
				'X-Form-Signature': 'sig123',
				'X-Form-Signature-Ts': '2024-01-15T10:30:00.000Z',
			},
		});
		expect(extractSignatureHeaders(response)).toBeNull();
	});

	it('returns null when timestamp header is missing', () => {
		const response = new Response('body', {
			headers: {
				'X-Form-Signature': 'sig123',
				'X-Form-Signature-Alg': 'sha256',
			},
		});
		expect(extractSignatureHeaders(response)).toBeNull();
	});
});

describe('verifyHmacSignature', () => {
	const secret = 'test-secret-key';
	const body = '{"data":"hello"}';

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('accepts a valid round-trip signature', () => {
		const headers = createHmacSignature(body, secret);
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('rejects a wrong signature with HMAC mismatch error', () => {
		const headers = createHmacSignature(body, secret);
		headers.signature = 'a'.repeat(64);
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('HMAC mismatch');
		expect(result.error).toContain('signature does not match');
	});

	it('rejects tampered body', () => {
		const headers = createHmacSignature(body, secret);
		const result = verifyHmacSignature('{"data":"TAMPERED"}', headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('HMAC mismatch');
	});

	it('rejects wrong secret', () => {
		const headers = createHmacSignature(body, secret);
		const result = verifyHmacSignature(body, headers, 'wrong-secret');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('HMAC mismatch');
	});

	it('rejects unsupported algorithm', () => {
		const headers = createHmacSignature(body, secret);
		(headers as any).algorithm = 'md5';
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('unsupported algorithm');
		expect(result.error).toContain('md5');
	});

	it('rejects invalid timestamp format', () => {
		const headers = createHmacSignature(body, secret);
		headers.timestamp = 'not-a-date';
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('invalid timestamp');
	});

	it('rejects expired timestamp (>5 min)', () => {
		const headers = createHmacSignature(body, secret);
		vi.setSystemTime(new Date('2024-01-15T12:06:00.000Z'));
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('timestamp expired');
		expect(result.error).toContain('exceeds 300s');
	});

	it('accepts timestamp just within 5 min window', () => {
		const headers = createHmacSignature(body, secret);
		vi.setSystemTime(new Date('2024-01-15T12:04:59.000Z'));
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(true);
	});

	it('respects custom maxAgeSec parameter', () => {
		const headers = createHmacSignature(body, secret);
		vi.setSystemTime(new Date('2024-01-15T12:00:31.000Z'));
		const result = verifyHmacSignature(body, headers, secret, 30);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('exceeds 30s');
	});

	it('rejects signature with wrong length', () => {
		const headers = createHmacSignature(body, secret);
		headers.signature = 'tooshort';
		const result = verifyHmacSignature(body, headers, secret);
		expect(result.valid).toBe(false);
		expect(result.error).toContain('signature length mismatch');
	});
});
