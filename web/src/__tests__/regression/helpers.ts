/**
 * Shared test helpers for regression tests.
 * Provides mock factories for auth sessions, prisma, and NextRequest builders.
 */

import { vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { TenantSession } from '@/lib/auth-helpers';

// ---- Session Factories ----

export const TENANT_ID = 'tenant-test-001';
export const OTHER_TENANT_ID = 'tenant-test-002';
export const USER_ID = 'user-test-001';

export function ownerSession(): TenantSession {
    return { userId: USER_ID, tenantId: TENANT_ID, role: 'owner' };
}

export function adminSession(): TenantSession {
    return { userId: USER_ID, tenantId: TENANT_ID, role: 'admin' };
}

export function viewerSession(): TenantSession {
    return { userId: USER_ID, tenantId: TENANT_ID, role: 'viewer' };
}

// ---- Request Builders ----

const BASE_URL = 'http://localhost:3000';

export function makeGet(path: string, params?: Record<string, string>): NextRequest {
    const url = new URL(path, BASE_URL);
    if (params) {
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    return new NextRequest(url, { method: 'GET' });
}

export function makePost(path: string, body: unknown = {}): NextRequest {
    return new NextRequest(new URL(path, BASE_URL), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export function makePut(path: string, body: unknown = {}): NextRequest {
    return new NextRequest(new URL(path, BASE_URL), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export function makePatch(path: string, body: unknown = {}): NextRequest {
    return new NextRequest(new URL(path, BASE_URL), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
}

export function makeDelete(path: string): NextRequest {
    return new NextRequest(new URL(path, BASE_URL), { method: 'DELETE' });
}

// ---- Route Context Builders ----

/** Build the context object expected by dynamic route handlers */
export function routeParams(params: Record<string, string>) {
    return { params: Promise.resolve(params) };
}

// ---- Prisma Mock Helpers ----

/** Minimal no-op prisma mock — individual tests override the methods they need */
export function createMockPrisma() {
    const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
            if (prop === '$queryRaw') return vi.fn().mockResolvedValue([]);
            if (prop === '$transaction') return vi.fn((fn: (tx: unknown) => unknown) => fn(_target));
            // Return a model-like object with chainable methods
            return new Proxy({}, {
                get() {
                    return vi.fn().mockResolvedValue(null);
                },
            });
        },
    };
    return new Proxy({} as Record<string, unknown>, handler);
}
