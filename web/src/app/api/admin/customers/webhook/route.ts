import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import { createHmacSignature, buildSignatureHeaders } from '@/lib/hmac';

const WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/81077ef9-b372-4780-9f78-92884f3a6e83';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId },
            select: { sharedSecret: true },
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        const body = JSON.stringify({ tenantId: session.user.tenantId });
        const hmac = createHmacSignature(body, tenant.sharedSecret);
        const signatureHeaders = buildSignatureHeaders(hmac);

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...signatureHeaders,
            },
            body,
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error('[Customers Webhook] Upstream error:', response.status);
            return NextResponse.json(
                { error: 'Webhook request failed' },
                { status: 502 }
            );
        }

        const data = await response.json();

        return NextResponse.json({ customers: data });
    } catch (error) {
        console.error('[Customers Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}
