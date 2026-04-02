/**
 * E5.1 Regression Tests — Section 2: API Role Enforcement
 *
 * Tests that every admin API endpoint enforces the correct role matrix:
 *   owner/admin → allowed
 *   viewer      → 403 on write endpoints
 *   unauth      → 403 (requireTenantSession returns null)
 *
 * Route handlers are imported directly; auth and prisma are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { requireTenantSession } from '@/lib/auth-helpers';
import {
    ownerSession,
    adminSession,
    viewerSession,
    makeGet,
    makePost,
    makePut,
    routeParams,
    TENANT_ID,
    USER_ID,
} from './helpers';
import type { TenantSession } from '@/lib/auth-helpers';

// ---- Module Mocks ----

vi.mock('@/lib/auth-helpers', () => ({
    requireTenantSession: vi.fn(),
    isAdministrator: (role: string) => role === 'owner' || role === 'admin',
    forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
}));

vi.mock('@/lib/prisma', () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
            if (prop === '$queryRaw') return vi.fn().mockResolvedValue([]);
            if (prop === '$transaction') return vi.fn(async (fn: Function) => fn(new Proxy({}, handler)));
            return new Proxy({}, {
                get() {
                    return vi.fn().mockResolvedValue(null);
                },
            });
        },
    };
    return { default: new Proxy({} as Record<string, unknown>, handler) };
});

vi.mock('@/lib/usage', () => ({
    canAddTeamMember: vi.fn().mockResolvedValue({ allowed: true }),
    canReceiveSubmission: vi.fn().mockResolvedValue({ allowed: true }),
    canCreateForm: vi.fn().mockResolvedValue({ allowed: true }),
}));

vi.mock('@/lib/audit', () => ({
    logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/magic-link', () => ({
    createAndSendMagicLink: vi.fn().mockResolvedValue({ success: true }),
    sendFormInviteEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/wizard-n8n', () => ({
    lookupWip: vi.fn().mockResolvedValue({ found: true, companyName: 'Test', wipNumber: '1111', metadata: {} }),
    prefillFromWip: vi.fn().mockResolvedValue({ success: true, values: {} }),
}));

vi.mock('@/lib/prefill-token', () => ({
    generatePrefillToken: vi.fn().mockResolvedValue('mock-token'),
    buildPrefillUrl: vi.fn().mockReturnValue('http://localhost/f/test?ctx=mock'),
}));

// ---- Helpers ----

function mockAs(session: TenantSession | null) {
    vi.mocked(requireTenantSession).mockResolvedValue(session);
}

// ======================================================================
// AUDIT API
// ======================================================================

describe('Audit API — GET /api/admin/audit', () => {
    let GET: Function;

    beforeEach(async () => {
        const mod = await import('@/app/api/admin/audit/route');
        GET = mod.GET;
    });

    it('allows owner', async () => {
        mockAs(ownerSession());
        const res = await GET(makeGet('/api/admin/audit'));
        expect(res.status).not.toBe(403);
    });

    it('allows admin', async () => {
        mockAs(adminSession());
        const res = await GET(makeGet('/api/admin/audit'));
        expect(res.status).not.toBe(403);
    });

    it('rejects viewer with 403', async () => {
        mockAs(viewerSession());
        const res = await GET(makeGet('/api/admin/audit'));
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated with 403', async () => {
        mockAs(null);
        const res = await GET(makeGet('/api/admin/audit'));
        expect(res.status).toBe(403);
    });
});

// ======================================================================
// TEAM API
// ======================================================================

describe('Team API — GET /api/admin/team', () => {
    let GET: Function;

    beforeEach(async () => {
        const mod = await import('@/app/api/admin/team/route');
        GET = mod.GET;
    });

    it('allows all authenticated roles', async () => {
        for (const session of [ownerSession(), adminSession(), viewerSession()]) {
            mockAs(session);
            const res = await GET();
            expect(res.status).not.toBe(403);
        }
    });

    it('rejects unauthenticated', async () => {
        mockAs(null);
        const res = await GET();
        expect(res.status).toBe(403);
    });
});

describe('Team API — POST /api/admin/team (invite)', () => {
    let POST: Function;

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('@/lib/auth-helpers', () => ({
            requireTenantSession: vi.fn(),
            isAdministrator: (role: string) => role === 'owner' || role === 'admin',
            forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }));
        vi.doMock('@/lib/prisma', () => {
            return {
                default: {
                    user: {
                        findUnique: vi.fn().mockResolvedValue({ role: 'owner', id: USER_ID }),
                        findFirst: vi.fn().mockResolvedValue(null),
                        create: vi.fn().mockResolvedValue({ id: 'new-user', email: 'new@test.com' }),
                    },
                    tenant: {
                        findUnique: vi.fn().mockResolvedValue({ plan: 'pro', name: 'Test Tenant' }),
                    },
                },
            };
        });
        vi.doMock('@/lib/usage', () => ({
            canAddTeamMember: vi.fn().mockResolvedValue({ allowed: true }),
        }));
        const mod = await import('@/app/api/admin/team/route');
        POST = mod.POST;
    });

    it('allows owner to invite', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(ownerSession());
        const res = await POST(makePost('/api/admin/team', { email: 'new@test.com', role: 'viewer' }));
        expect(res.status).not.toBe(403);
    });

    it('rejects unauthenticated', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(null);
        const res = await POST(makePost('/api/admin/team', { email: 'new@test.com' }));
        expect(res.status).toBe(403);
    });
});

// ======================================================================
// WIZARD API
// ======================================================================

describe('Wizard API — GET /api/admin/wizard (list)', () => {
    let GET: Function;

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('@/lib/auth-helpers', () => ({
            requireTenantSession: vi.fn(),
            isAdministrator: (role: string) => role === 'owner' || role === 'admin',
            forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }));
        vi.doMock('@/lib/prisma', () => ({
            default: {
                wizardRun: {
                    findMany: vi.fn().mockResolvedValue([]),
                    count: vi.fn().mockResolvedValue(0),
                },
            },
        }));
        const mod = await import('@/app/api/admin/wizard/route');
        GET = mod.GET;
    });

    it('allows owner and admin', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        for (const session of [ownerSession(), adminSession()]) {
            vi.mocked(rts).mockResolvedValue(session);
            const res = await GET(makeGet('/api/admin/wizard'));
            expect(res.status).not.toBe(403);
        }
    });

    it('rejects viewer with 403', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(viewerSession());
        const res = await GET(makeGet('/api/admin/wizard'));
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(null);
        const res = await GET(makeGet('/api/admin/wizard'));
        expect([401, 403]).toContain(res.status);
    });
});

describe('Wizard API — POST wip-lookup', () => {
    let POST: Function;

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('@/lib/auth-helpers', () => ({
            requireTenantSession: vi.fn(),
            isAdministrator: (role: string) => role === 'owner' || role === 'admin',
            forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }));
        vi.doMock('@/lib/prisma', () => ({
            default: {
                tenant: {
                    findUnique: vi.fn().mockResolvedValue({
                        wipLookupWebhookUrl: 'https://n8n.test/wip',
                        sharedSecret: 'test-secret',
                    }),
                },
                wizardRun: {
                    create: vi.fn().mockResolvedValue({ id: 'wiz-1', wipNumber: '1111', state: 'wip_lookup' }),
                },
            },
        }));
        vi.doMock('@/lib/audit', () => ({ logAuditEvent: vi.fn().mockResolvedValue(undefined) }));
        vi.doMock('@/lib/wizard-n8n', () => ({
            lookupWip: vi.fn().mockResolvedValue({ found: true, companyName: 'Test', wipNumber: '1111', metadata: {} }),
        }));
        const mod = await import('@/app/api/admin/wizard/wip-lookup/route');
        POST = mod.POST;
    });

    it('allows owner and admin', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        for (const session of [ownerSession(), adminSession()]) {
            vi.mocked(rts).mockResolvedValue(session);
            const res = await POST(makePost('/api/admin/wizard/wip-lookup', { wipNumber: '1111' }));
            expect(res.status).not.toBe(403);
        }
    });

    it('rejects viewer with 403', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(viewerSession());
        const res = await POST(makePost('/api/admin/wizard/wip-lookup', { wipNumber: '1111' }));
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(null);
        const res = await POST(makePost('/api/admin/wizard/wip-lookup', { wipNumber: '1111' }));
        expect([401, 403]).toContain(res.status);
    });
});

describe('Wizard API — POST assign', () => {
    let POST: Function;

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('@/lib/auth-helpers', () => ({
            requireTenantSession: vi.fn(),
            isAdministrator: (role: string) => role === 'owner' || role === 'admin',
            forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }));
        vi.doMock('@/lib/prisma', () => ({
            default: {
                wizardRun: {
                    findFirst: vi.fn().mockResolvedValue({
                        id: 'wiz-1', tenantId: TENANT_ID, state: 'prefilled',
                        templateId: 'tmpl-1', pinnedVersionId: 'ver-1',
                        wipNumber: '1111', wipContext: { companyName: 'Test', wipNumber: 1111, metadata: {} },
                        prefillData: {},
                    }),
                    update: vi.fn().mockResolvedValue({}),
                },
                form: { findFirst: vi.fn().mockResolvedValue({ id: 'form-1', publicId: 'test-form', name: 'Test' }) },
                endCustomer: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({ id: 'ec-1', email: 'user@test.com', name: 'Test' }),
                },
                formAssignment: {
                    findUnique: vi.fn().mockResolvedValue(null),
                    create: vi.fn().mockResolvedValue({ id: 'assign-1' }),
                },
                tenant: { findUnique: vi.fn().mockResolvedValue({ name: 'Test Tenant' }) },
            },
        }));
        vi.doMock('@/lib/audit', () => ({ logAuditEvent: vi.fn().mockResolvedValue(undefined) }));
        vi.doMock('@/lib/prefill-token', () => ({
            generatePrefillToken: vi.fn().mockResolvedValue('mock-token'),
            buildPrefillUrl: vi.fn().mockReturnValue('http://localhost/f/test?ctx=mock'),
        }));
        vi.doMock('@/lib/magic-link', () => ({
            createAndSendMagicLink: vi.fn().mockResolvedValue({ success: true }),
            sendFormInviteEmail: vi.fn().mockResolvedValue({ success: true }),
        }));
        const mod = await import('@/app/api/admin/wizard/[id]/assign/route');
        POST = mod.POST;
    });

    const ctx = routeParams({ id: 'wiz-1' });
    const body = { endCustomerEmail: 'user@test.com', endCustomerName: 'Test User', sendInvite: false };

    it('allows owner', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(ownerSession());
        const res = await POST(makePost('/api/admin/wizard/wiz-1/assign', body), ctx);
        expect(res.status).not.toBe(403);
    });

    it('allows admin', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(adminSession());
        const res = await POST(makePost('/api/admin/wizard/wiz-1/assign', body), ctx);
        expect(res.status).not.toBe(403);
    });

    it('rejects viewer with 403', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(viewerSession());
        const res = await POST(makePost('/api/admin/wizard/wiz-1/assign', body), ctx);
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(null);
        const res = await POST(makePost('/api/admin/wizard/wiz-1/assign', body), ctx);
        expect([401, 403]).toContain(res.status);
    });
});

// ======================================================================
// TENANT API
// ======================================================================

describe('Tenant API — PUT /api/admin/tenant', () => {
    let PUT: Function;

    beforeEach(async () => {
        vi.resetModules();
        vi.doMock('@/lib/auth-helpers', () => ({
            requireTenantSession: vi.fn(),
            isAdministrator: (role: string) => role === 'owner' || role === 'admin',
            forbidden: () => NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }));
        vi.doMock('@/lib/prisma', () => ({
            default: {
                tenant: {
                    findUnique: vi.fn().mockResolvedValue({ id: TENANT_ID, name: 'Test' }),
                    update: vi.fn().mockResolvedValue({ id: TENANT_ID, name: 'Updated' }),
                },
            },
        }));
        const mod = await import('@/app/api/admin/tenant/route');
        PUT = mod.PUT;
    });

    it('allows owner and admin', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        for (const session of [ownerSession(), adminSession()]) {
            vi.mocked(rts).mockResolvedValue(session);
            const res = await PUT(makePut('/api/admin/tenant', { name: 'Updated' }));
            expect(res.status).not.toBe(403);
        }
    });

    it('rejects viewer with 403', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(viewerSession());
        const res = await PUT(makePut('/api/admin/tenant', { name: 'Updated' }));
        expect(res.status).toBe(403);
    });

    it('rejects unauthenticated', async () => {
        const { requireTenantSession: rts } = await import('@/lib/auth-helpers');
        vi.mocked(rts).mockResolvedValue(null);
        const res = await PUT(makePut('/api/admin/tenant', { name: 'Updated' }));
        expect(res.status).toBe(403);
    });
});
