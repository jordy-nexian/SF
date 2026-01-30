/**
 * Portal authentication tests
 * Tests for JWT creation/verification and magic link token generation.
 * Database operations are mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma first before importing the module
vi.mock('@/lib/prisma', () => ({
    default: {
        magicLinkToken: {
            create: vi.fn(),
            delete: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

// Mock email module
vi.mock('@/lib/email', () => ({
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import {
    generateMagicLinkToken,
    createPortalSession,
    verifyPortalSession,
    PORTAL_SESSION_COOKIE,
    getPortalSessionFromCookies,
} from '../portal-auth';

describe('generateMagicLinkToken', () => {
    it('generates a string token', () => {
        const token = generateMagicLinkToken();
        expect(typeof token).toBe('string');
    });

    it('generates a 64-character hex string (32 bytes)', () => {
        const token = generateMagicLinkToken();
        expect(token).toHaveLength(64);
        expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', () => {
        const token1 = generateMagicLinkToken();
        const token2 = generateMagicLinkToken();
        const token3 = generateMagicLinkToken();

        expect(token1).not.toBe(token2);
        expect(token2).not.toBe(token3);
        expect(token1).not.toBe(token3);
    });
});

describe('createPortalSession', () => {
    const testCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
        name: 'Test User',
    };

    it('creates a valid JWT string', async () => {
        const token = await createPortalSession(testCustomer);

        expect(typeof token).toBe('string');
        expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('creates a token that can be verified', async () => {
        const token = await createPortalSession(testCustomer);
        const session = await verifyPortalSession(token);

        expect(session).not.toBeNull();
        expect(session?.endCustomerId).toBe(testCustomer.id);
        expect(session?.tenantId).toBe(testCustomer.tenantId);
        expect(session?.email).toBe(testCustomer.email);
        expect(session?.name).toBe(testCustomer.name);
    });

    it('handles null name gracefully', async () => {
        const customerWithNullName = {
            ...testCustomer,
            name: null,
        };

        const token = await createPortalSession(customerWithNullName);
        const session = await verifyPortalSession(token);

        expect(session).not.toBeNull();
        expect(session?.name).toBeUndefined();
    });

    it('includes issued-at and expiration times', async () => {
        const before = Math.floor(Date.now() / 1000);
        const token = await createPortalSession(testCustomer);
        const session = await verifyPortalSession(token);
        const after = Math.floor(Date.now() / 1000);

        expect(session?.iat).toBeGreaterThanOrEqual(before);
        expect(session?.iat).toBeLessThanOrEqual(after);
        expect(session?.exp).toBeGreaterThan(session!.iat);
    });
});

describe('verifyPortalSession', () => {
    it('returns null for invalid JWT', async () => {
        const result = await verifyPortalSession('invalid-token');
        expect(result).toBeNull();
    });

    it('returns null for malformed JWT', async () => {
        const result = await verifyPortalSession('not.a.valid.jwt.at.all');
        expect(result).toBeNull();
    });

    it('returns null for empty string', async () => {
        const result = await verifyPortalSession('');
        expect(result).toBeNull();
    });

    it('returns null for JWT signed with different secret', async () => {
        // This is a JWT signed with a different secret
        const invalidJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
        const result = await verifyPortalSession(invalidJwt);
        expect(result).toBeNull();
    });
});

describe('PORTAL_SESSION_COOKIE', () => {
    it('is a non-empty string', () => {
        expect(typeof PORTAL_SESSION_COOKIE).toBe('string');
        expect(PORTAL_SESSION_COOKIE.length).toBeGreaterThan(0);
    });

    it('has expected cookie name', () => {
        expect(PORTAL_SESSION_COOKIE).toBe('portal-session');
    });
});

describe('getPortalSessionFromCookies', () => {
    const testCustomer = {
        id: 'customer-123',
        tenantId: 'tenant-456',
        email: 'test@example.com',
    };

    it('returns null when cookie is not present', async () => {
        const cookies = {
            get: vi.fn().mockReturnValue(undefined),
        };

        const result = await getPortalSessionFromCookies(cookies);
        expect(result).toBeNull();
        expect(cookies.get).toHaveBeenCalledWith(PORTAL_SESSION_COOKIE);
    });

    it('returns null when cookie value is empty', async () => {
        const cookies = {
            get: vi.fn().mockReturnValue({ value: '' }),
        };

        const result = await getPortalSessionFromCookies(cookies);
        expect(result).toBeNull();
    });

    it('returns session when valid cookie is present', async () => {
        const token = await createPortalSession(testCustomer);
        const cookies = {
            get: vi.fn().mockReturnValue({ value: token }),
        };

        const result = await getPortalSessionFromCookies(cookies);
        expect(result).not.toBeNull();
        expect(result?.endCustomerId).toBe(testCustomer.id);
    });

    it('returns null for invalid cookie token', async () => {
        const cookies = {
            get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
        };

        const result = await getPortalSessionFromCookies(cookies);
        expect(result).toBeNull();
    });
});
