/**
 * GET /api/admin/branding - Get portal branding settings
 * PUT /api/admin/branding - Update portal branding settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId },
            select: {
                portalTitle: true,
                portalLogoUrl: true,
                portalPrimaryColor: true,
                name: true,
            },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        return NextResponse.json({
            branding: {
                portalTitle: tenant.portalTitle || tenant.name,
                portalLogoUrl: tenant.portalLogoUrl || null,
                portalPrimaryColor: tenant.portalPrimaryColor || '#6366f1',
            },
        });
    } catch (error) {
        console.error('[Admin Branding] Get error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch branding' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        // Validate hex color if provided
        if (body.portalPrimaryColor && !/^#[0-9A-Fa-f]{6}$/.test(body.portalPrimaryColor)) {
            return NextResponse.json(
                { error: 'Invalid color format. Use hex format like #6366f1' },
                { status: 400 }
            );
        }

        const updated = await prisma.tenant.update({
            where: { id: session.user.tenantId },
            data: {
                portalTitle: body.portalTitle?.trim() || null,
                portalLogoUrl: body.portalLogoUrl?.trim() || null,
                portalPrimaryColor: body.portalPrimaryColor || null,
            },
            select: {
                portalTitle: true,
                portalLogoUrl: true,
                portalPrimaryColor: true,
                name: true,
            },
        });

        return NextResponse.json({
            branding: {
                portalTitle: updated.portalTitle || updated.name,
                portalLogoUrl: updated.portalLogoUrl,
                portalPrimaryColor: updated.portalPrimaryColor || '#6366f1',
            },
        });
    } catch (error) {
        console.error('[Admin Branding] Update error:', error);
        return NextResponse.json(
            { error: 'Failed to update branding' },
            { status: 500 }
        );
    }
}
