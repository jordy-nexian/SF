/**
 * POST /api/portal/auth/request-link
 * Request a magic link for portal access.
 * Rate limited to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAndSendMagicLink } from '@/lib/portal-auth';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

interface RequestBody {
    email: string;
    tenantId?: string; // Optional - if not provided, look up by email
}

export async function POST(request: NextRequest) {
    try {
        // Rate limit by IP
        const ip = getClientIp(request.headers);
        const rateCheck = await rateLimit(`portal-magic-link:${ip}`, RATE_LIMITS.auth);

        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)),
                    },
                }
            );
        }

        const body: RequestBody = await request.json();

        if (!body.email || typeof body.email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const email = body.email.trim().toLowerCase();

        // Find end customer by email (and optionally tenant)
        const whereClause: { email: string; tenantId?: string } = { email };
        if (body.tenantId) {
            whereClause.tenantId = body.tenantId;
        }

        const endCustomer = await prisma.endCustomer.findFirst({
            where: whereClause,
            include: {
                tenant: {
                    select: { name: true },
                },
            },
        });

        // Always return success to prevent email enumeration
        // But only actually send if customer exists
        if (endCustomer) {
            await createAndSendMagicLink(
                endCustomer.id,
                endCustomer.email,
                endCustomer.tenant.name
            );
        }

        // Generic success message (prevents email enumeration)
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a magic link has been sent.',
        });
    } catch (error) {
        console.error('[Portal Auth] Request link error:', error);
        return NextResponse.json(
            { error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
