/**
 * POST /api/portal/auth/verify
 * Verify a magic link token and create a session.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    validateMagicLinkToken,
    createPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';

interface RequestBody {
    token: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();

        if (!body.token || typeof body.token !== 'string') {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            );
        }

        // Validate the magic link token
        const result = await validateMagicLinkToken(body.token);

        if (!result.success || !result.endCustomer) {
            return NextResponse.json(
                { error: result.error || 'Invalid token' },
                { status: 401 }
            );
        }

        // Create session JWT
        const sessionToken = await createPortalSession(result.endCustomer);

        // Create response with session cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: result.endCustomer.id,
                email: result.endCustomer.email,
                name: result.endCustomer.name,
            },
        });

        // Set secure cookie with session token
        response.cookies.set(PORTAL_SESSION_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[Portal Auth] Verify error:', error);
        return NextResponse.json(
            { error: 'Failed to verify token' },
            { status: 500 }
        );
    }
}
