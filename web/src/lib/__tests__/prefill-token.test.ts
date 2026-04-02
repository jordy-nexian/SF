/**
 * Prefill token (JWE) generation and verification tests.
 * Covers wipContext document metadata roundtrip and size guardrails.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    generatePrefillToken,
    verifyPrefillToken,
    buildPrefillUrl,
} from '../prefill-token';

const BASE_OPTIONS = {
    publicId: 'form-abc',
    tenantId: 'tenant-123',
    tokenValues: { tok1: 'value1', tok2: 'value2' },
    customerEmail: 'user@example.com',
    customerName: 'Test User',
    wipNumber: 'WIP-54321',
};

describe('generatePrefillToken + verifyPrefillToken', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('roundtrips basic payload without wipContext', async () => {
        const token = await generatePrefillToken(BASE_OPTIONS);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload).not.toBeNull();
        expect(payload!.f).toBe('form-abc');
        expect(payload!.t).toBe('tenant-123');
        expect(payload!.v).toEqual({ tok1: 'value1', tok2: 'value2' });
        expect(payload!.c).toEqual({ e: 'user@example.com', n: 'Test User', w: 'WIP-54321' });
        expect(payload!.d).toBeUndefined();
    });

    it('roundtrips payload with wipContext', async () => {
        const token = await generatePrefillToken({
            ...BASE_OPTIONS,
            wipContext: {
                companyName: 'Acme Corp',
                wipNumber: 54321,
                metadata: {
                    department: 'Engineering',
                    priority: 'High',
                    estimatedValue: '$25,000',
                },
            },
        });

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload).not.toBeNull();
        // Customer context still present
        expect(payload!.c).toEqual({ e: 'user@example.com', n: 'Test User', w: 'WIP-54321' });
        // Document context uses compact keys
        expect(payload!.d).toEqual({
            cn: 'Acme Corp',
            wn: 54321,
            md: {
                department: 'Engineering',
                priority: 'High',
                estimatedValue: '$25,000',
            },
        });
    });

    it('omits d field when wipContext is empty object', async () => {
        const token = await generatePrefillToken({
            ...BASE_OPTIONS,
            wipContext: {},
        });

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload).not.toBeNull();
        expect(payload!.d).toBeUndefined();
    });

    it('includes d.cn and d.wn without d.md when metadata is empty', async () => {
        const token = await generatePrefillToken({
            ...BASE_OPTIONS,
            wipContext: {
                companyName: 'Acme Corp',
                wipNumber: 99999,
            },
        });

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload!.d).toEqual({
            cn: 'Acme Corp',
            wn: 99999,
        });
        expect(payload!.d!.md).toBeUndefined();
    });

    it('omits d field when wipContext exceeds size limit', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Build a metadata object that exceeds 2048 bytes
        const largeMetadata: Record<string, unknown> = {};
        for (let i = 0; i < 200; i++) {
            largeMetadata[`field_${i}_with_a_long_key_name`] = `value_${i}_${'x'.repeat(50)}`;
        }

        const token = await generatePrefillToken({
            ...BASE_OPTIONS,
            wipContext: {
                companyName: 'Acme Corp',
                wipNumber: 54321,
                metadata: largeMetadata,
            },
        });

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload).not.toBeNull();
        // d should be omitted due to size limit
        expect(payload!.d).toBeUndefined();
        // Warning should have been logged
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('wipContext exceeds size limit'),
            expect.objectContaining({ limit: 2048 })
        );
    });

    it('returns null for wrong publicId', async () => {
        const token = await generatePrefillToken(BASE_OPTIONS);
        const payload = await verifyPrefillToken(token, 'wrong-id');
        expect(payload).toBeNull();
    });

    it('returns null for expired token', async () => {
        const token = await generatePrefillToken({
            ...BASE_OPTIONS,
            expiresInSeconds: 1,
        });

        // Wait for token to expire
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const payload = await verifyPrefillToken(token, 'form-abc');
        expect(payload).toBeNull();
    }, 5000);
});

describe('buildPrefillUrl', () => {
    it('builds a correct form URL with ctx parameter', () => {
        const url = buildPrefillUrl('https://example.com', 'form-abc', 'encrypted-token');
        expect(url).toBe('https://example.com/f/form-abc?ctx=encrypted-token');
    });
});
