/**
 * GET /api/portal/branding
 * Get portal branding for the current session's tenant.
 * Public endpoint - returns branding based on session or query param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyPortalSession, PORTAL_SESSION_COOKIE } from '@/lib/portal-auth';

export async function GET(request: NextRequest) {
    try {
        let tenantId: string | null = null;

        // Try to get tenant from portal session
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (sessionCookie?.value) {
            const session = await verifyPortalSession(sessionCookie.value);
            if (session) {
                tenantId = session.tenantId;
            }
        }

        // Fallback: tenant ID from query param (for login page)
        if (!tenantId) {
            tenantId = request.nextUrl.searchParams.get('tenantId');
        }

        // Default branding if no tenant
        if (!tenantId) {
            return NextResponse.json({
                branding: {
                    portalTitle: 'Forms Portal',
                    portalLogoUrl: null,
                    portalPrimaryColor: '#6366f1',
                },
            });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                name: true,
                portalTitle: true,
                portalLogoUrl: true,
                portalPrimaryColor: true,
            },
        });

        if (!tenant) {
            return NextResponse.json({
                branding: {
                    portalTitle: 'Forms Portal',
                    portalLogoUrl: null,
                    portalPrimaryColor: '#6366f1',
                },
            });
        }

        return NextResponse.json({
            branding: {
                portalTitle: tenant.portalTitle || tenant.name,
                portalLogoUrl: tenant.portalLogoUrl || null,
                portalPrimaryColor: tenant.portalPrimaryColor || '#6366f1',
            },
        });
    } catch (error) {
        console.error('[Portal Branding] Error:', error);
        return NextResponse.json({
            branding: {
                portalTitle: 'Forms Portal',
                portalLogoUrl: null,
                portalPrimaryColor: '#6366f1',
            },
        });
    }
}
