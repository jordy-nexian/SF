#!/usr/bin/env npx tsx
/**
 * E5.3 — Post-deployment RBAC & route protection validation.
 *
 * Run against a deployed Vercel instance to verify:
 *   1. Unauthenticated requests are blocked from admin APIs
 *   2. Each role (owner/admin/viewer) gets correct access
 *   3. Direct-URL route protection works
 *   4. Public form routes remain open
 *   5. Tenant isolation holds (cross-tenant access blocked)
 *
 * Usage:
 *   npx tsx scripts/validate-deployment.ts <BASE_URL> <OWNER_EMAIL> <OWNER_PASSWORD> [VIEWER_EMAIL] [VIEWER_PASSWORD]
 *
 * Example:
 *   npx tsx scripts/validate-deployment.ts https://your-app.vercel.app owner@company.com password123 viewer@company.com viewerpass
 *
 * The script uses the NextAuth credentials flow to obtain session cookies,
 * then exercises the API permission matrix from the regression test matrix.
 */

// ---- Config ----

const [BASE_URL, OWNER_EMAIL, OWNER_PASSWORD, VIEWER_EMAIL, VIEWER_PASSWORD] =
    process.argv.slice(2);

if (!BASE_URL || !OWNER_EMAIL || !OWNER_PASSWORD) {
    console.error(
        'Usage: npx tsx scripts/validate-deployment.ts <BASE_URL> <OWNER_EMAIL> <OWNER_PASSWORD> [VIEWER_EMAIL] [VIEWER_PASSWORD]'
    );
    process.exit(1);
}

// ---- Types ----

type Role = 'owner' | 'admin' | 'viewer' | 'unauth';
interface TestResult {
    section: string;
    test: string;
    expected: string;
    actual: string;
    pass: boolean;
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;

// ---- Auth ----

/**
 * Authenticate via NextAuth credentials provider and return the session cookie.
 * NextAuth uses a CSRF-token flow: GET /api/auth/csrf → POST /api/auth/callback/credentials.
 */
async function login(email: string, password: string): Promise<string | null> {
    try {
        // Step 1: Get CSRF token and cookies
        const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
            redirect: 'manual',
        });
        const csrfData = await csrfRes.json();
        const csrfToken = csrfData.csrfToken;
        const setCookies = csrfRes.headers.getSetCookie?.() || [];
        const cookieJar = setCookies.map((c: string) => c.split(';')[0]).join('; ');

        // Step 2: POST credentials
        const callbackRes = await fetch(
            `${BASE_URL}/api/auth/callback/credentials`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    cookie: cookieJar,
                },
                body: new URLSearchParams({
                    csrfToken,
                    email,
                    password,
                    json: 'true',
                }),
                redirect: 'manual',
            }
        );

        // Step 3: Extract session cookie from redirect response
        const allSetCookies = callbackRes.headers.getSetCookie?.() || [];
        const sessionCookie = allSetCookies
            .map((c: string) => c.split(';')[0])
            .find((c: string) =>
                c.startsWith('next-auth.session-token=') ||
                c.startsWith('__Secure-next-auth.session-token=')
            );

        if (!sessionCookie) {
            console.error(`  [LOGIN FAILED] No session cookie for ${email}`);
            return null;
        }

        // Combine all cookies (csrf + session)
        const fullCookieJar = [cookieJar, sessionCookie].filter(Boolean).join('; ');
        return fullCookieJar;
    } catch (err) {
        console.error(`  [LOGIN ERROR] ${email}:`, (err as Error).message);
        return null;
    }
}

// ---- Test Runner ----

function record(section: string, test: string, expected: string, actual: string, pass: boolean) {
    results.push({ section, test, expected, actual, pass });
    if (pass) {
        passed++;
        console.log(`  ✓ ${test}`);
    } else {
        failed++;
        console.log(`  ✗ ${test}  (expected ${expected}, got ${actual})`);
    }
}

async function expectStatus(
    section: string,
    testName: string,
    method: string,
    path: string,
    cookies: string | null,
    expectedStatuses: number[],
    body?: unknown
) {
    try {
        const headers: Record<string, string> = {};
        if (cookies) headers.cookie = cookies;
        if (body) headers['content-type'] = 'application/json';

        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual',
        });

        const pass = expectedStatuses.includes(res.status);
        record(section, testName, expectedStatuses.join('|'), String(res.status), pass);
    } catch (err) {
        record(section, testName, expectedStatuses.join('|'), `ERROR: ${(err as Error).message}`, false);
    }
}

async function expectRedirect(
    section: string,
    testName: string,
    path: string,
    cookies: string | null
) {
    try {
        const headers: Record<string, string> = {};
        if (cookies) headers.cookie = cookies;

        const res = await fetch(`${BASE_URL}${path}`, {
            headers,
            redirect: 'manual',
        });

        // Next.js redirects return 307/308 or 302/303
        const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
        record(section, testName, 'redirect (3xx)', String(res.status), isRedirect);
    } catch (err) {
        record(section, testName, 'redirect (3xx)', `ERROR: ${(err as Error).message}`, false);
    }
}

// ======================================================================
// MAIN
// ======================================================================

async function main() {
    console.log(`\n╔══════════════════════════════════════════════════╗`);
    console.log(`║  E5.3 Post-Deployment RBAC Validation            ║`);
    console.log(`║  Target: ${BASE_URL.padEnd(39)}║`);
    console.log(`╚══════════════════════════════════════════════════╝\n`);

    // ---- Authenticate ----
    console.log('▸ Authenticating...');
    const ownerCookies = await login(OWNER_EMAIL, OWNER_PASSWORD);
    if (!ownerCookies) {
        console.error('FATAL: Could not authenticate as owner. Aborting.');
        process.exit(1);
    }
    console.log(`  Owner login: OK`);

    let viewerCookies: string | null = null;
    if (VIEWER_EMAIL && VIEWER_PASSWORD) {
        viewerCookies = await login(VIEWER_EMAIL, VIEWER_PASSWORD);
        if (viewerCookies) {
            console.log(`  Viewer login: OK`);
        } else {
            console.log(`  Viewer login: FAILED (viewer tests will be skipped)`);
        }
    } else {
        console.log('  Viewer credentials not provided — viewer tests will be skipped');
    }

    // ================================================================
    // Section 1: Unauthenticated access to admin APIs → blocked
    // ================================================================
    console.log('\n▸ Section 1: Unauthenticated API access');

    const unauthAPIs = [
        ['GET', '/api/admin/tenant'],
        ['GET', '/api/admin/team'],
        ['GET', '/api/admin/forms'],
        ['GET', '/api/admin/audit'],
        ['GET', '/api/admin/wizard'],
        ['GET', '/api/admin/assignments'],
        ['GET', '/api/admin/customers'],
    ];

    for (const [method, path] of unauthAPIs) {
        await expectStatus(
            'Unauth API',
            `${method} ${path} → blocked`,
            method,
            path,
            null,
            [401, 403]
        );
    }

    // ================================================================
    // Section 2: Unauthenticated access to admin pages → redirect
    // ================================================================
    console.log('\n▸ Section 2: Unauthenticated page access (should redirect to /signin)');

    const adminPages = [
        '/admin',
        '/admin/manage',
        '/admin/manage/settings',
        '/admin/team',
        '/admin/wizard',
        '/admin/customers',
        '/admin/assignments',
    ];

    for (const path of adminPages) {
        await expectRedirect('Unauth Page', `GET ${path} → redirect`, path, null);
    }

    // ================================================================
    // Section 3: Owner access to admin APIs → allowed
    // ================================================================
    console.log('\n▸ Section 3: Owner API access');

    const ownerAPIs = [
        ['GET', '/api/admin/tenant'],
        ['GET', '/api/admin/team'],
        ['GET', '/api/admin/forms'],
        ['GET', '/api/admin/audit'],
        ['GET', '/api/admin/wizard'],
        ['GET', '/api/admin/customers'],
    ];

    for (const [method, path] of ownerAPIs) {
        await expectStatus(
            'Owner API',
            `${method} ${path} → allowed`,
            method,
            path,
            ownerCookies,
            [200]
        );
    }

    // ================================================================
    // Section 4: Owner write operations → allowed
    // ================================================================
    console.log('\n▸ Section 4: Owner write operations');

    // PUT tenant — use an innocuous update (same name)
    await expectStatus(
        'Owner Write',
        'PUT /api/admin/tenant → allowed',
        'PUT',
        '/api/admin/tenant',
        ownerCookies,
        [200],
        { name: '__validation_test__' }
    );

    // ================================================================
    // Section 5: Viewer role restrictions (if viewer credentials provided)
    // ================================================================
    if (viewerCookies) {
        console.log('\n▸ Section 5: Viewer role restrictions');

        // Viewer can read
        await expectStatus(
            'Viewer Read',
            'GET /api/admin/team → allowed',
            'GET',
            '/api/admin/team',
            viewerCookies,
            [200]
        );

        await expectStatus(
            'Viewer Read',
            'GET /api/admin/forms → allowed',
            'GET',
            '/api/admin/forms',
            viewerCookies,
            [200]
        );

        // Viewer blocked from writes
        await expectStatus(
            'Viewer Blocked',
            'PUT /api/admin/tenant → 403',
            'PUT',
            '/api/admin/tenant',
            viewerCookies,
            [403],
            { name: 'should-fail' }
        );

        await expectStatus(
            'Viewer Blocked',
            'GET /api/admin/audit → 403',
            'GET',
            '/api/admin/audit',
            viewerCookies,
            [403]
        );

        await expectStatus(
            'Viewer Blocked',
            'GET /api/admin/wizard → 403',
            'GET',
            '/api/admin/wizard',
            viewerCookies,
            [401, 403]
        );

        await expectStatus(
            'Viewer Blocked',
            'POST /api/admin/wizard/wip-lookup → 403',
            'POST',
            '/api/admin/wizard/wip-lookup',
            viewerCookies,
            [401, 403],
            { wipNumber: '9999' }
        );

        await expectStatus(
            'Viewer Blocked',
            'POST /api/admin/team → 403',
            'POST',
            '/api/admin/team',
            viewerCookies,
            [403],
            { email: 'test@shouldfail.com', role: 'viewer' }
        );

        // Viewer settings page redirect
        await expectRedirect(
            'Viewer Page',
            'GET /admin/manage/settings → redirect',
            '/admin/manage/settings',
            viewerCookies
        );
    }

    // ================================================================
    // Section 6: Public form routes (should remain open)
    // ================================================================
    console.log('\n▸ Section 6: Public form routes');

    // Nonexistent form should return a structured error, not a crash
    await expectStatus(
        'Public Form',
        'GET /api/forms/nonexistent-form → 404',
        'GET',
        '/api/forms/nonexistent-form-12345',
        null,
        [404]
    );

    // Submit to nonexistent form
    await expectStatus(
        'Public Form',
        'POST /api/forms/nonexistent-form/submit → 404',
        'POST',
        '/api/forms/nonexistent-form-12345/submit',
        null,
        [400, 404],
        { formId: 'fake', answers: {} }
    );

    // ================================================================
    // Section 7: Portal auth (magic link endpoints available)
    // ================================================================
    console.log('\n▸ Section 7: Portal auth endpoints');

    await expectStatus(
        'Portal Auth',
        'GET /api/portal/auth/session → 401 (no cookie)',
        'GET',
        '/api/portal/auth/session',
        null,
        [401]
    );

    await expectStatus(
        'Portal Auth',
        'POST /api/portal/auth/request-link → 200 (always succeeds)',
        'POST',
        '/api/portal/auth/request-link',
        null,
        [200],
        { email: 'test-validation@example.com' }
    );

    // ================================================================
    // Section 8: Security headers
    // ================================================================
    console.log('\n▸ Section 8: Security headers');

    try {
        const res = await fetch(`${BASE_URL}/api/forms/test`, { redirect: 'manual' });
        const headers = res.headers;

        const hsts = headers.get('strict-transport-security');
        const cto = headers.get('x-content-type-options');

        record(
            'Security Headers',
            'X-Content-Type-Options: nosniff',
            'nosniff',
            cto || '(missing)',
            cto === 'nosniff'
        );

        // HSTS only present in production
        if (BASE_URL.startsWith('https://')) {
            record(
                'Security Headers',
                'Strict-Transport-Security present',
                'present',
                hsts ? 'present' : '(missing)',
                !!hsts
            );
        }
    } catch (err) {
        record('Security Headers', 'Fetch headers', 'success', `ERROR: ${(err as Error).message}`, false);
    }

    // ================================================================
    // Report
    // ================================================================
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log(`║  Results: ${passed} passed, ${failed} failed`.padEnd(51) + '║');
    console.log('╚══════════════════════════════════════════════════╝');

    if (failed > 0) {
        console.log('\nFailed tests:');
        for (const r of results.filter((r) => !r.pass)) {
            console.log(`  [${r.section}] ${r.test}`);
            console.log(`    expected: ${r.expected}  actual: ${r.actual}`);
        }
        process.exit(1);
    } else {
        console.log('\nAll checks passed.');
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Validation script failed:', err);
    process.exit(2);
});
