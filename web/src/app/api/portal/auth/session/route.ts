/**
 * GET /api/portal/auth/session - Get current portal session
 * POST /api/portal/auth/session - Refresh session (future use)
 * DELETE /api/portal/auth/session - Logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    verifyPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        const session = await verifyPortalSession(sessionCookie.value);

        if (!session) {
            // Clear invalid cookie
            const response = NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
            response.cookies.delete(PORTAL_SESSION_COOKIE);
            return response;
        }

        return NextResponse.json({
            authenticated: true,
            user: {
                id: session.endCustomerId,
                email: session.email,
                name: session.name,
                tenantId: session.tenantId,
            },
            expiresAt: new Date(session.exp * 1000).toISOString(),
        });
    } catch (error) {
        console.error('[Portal Auth] Session check error:', error);
        return NextResponse.json(
            { authenticated: false, error: 'Session check failed' },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const response = NextResponse.json({ success: true });
        response.cookies.delete(PORTAL_SESSION_COOKIE);
        return response;
    } catch (error) {
        console.error('[Portal Auth] Logout error:', error);
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}
