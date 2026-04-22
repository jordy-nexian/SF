/**
 * POST /api/portal/forms/[formId]/start
 * Mark a form assignment as "in_progress" when the user opens it,
 * and notify downstream systems (QuickBase via n8n) that the user
 * has started the form.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
    verifyPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';
import { createHmacSignature, buildSignatureHeaders } from '@/lib/hmac';

const FORM_STARTED_WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/079daf64-2399-4a64-abc4-f6a1dc6ecf63';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ formId: string }> }
) {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const session = await verifyPortalSession(sessionCookie.value);
        if (!session) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const { formId } = await params;
        const body = await request.json().catch(() => ({}));
        const clientWipNumber = body?.wipNumber ? String(body.wipNumber) : null;
        const clientRecordId = body?.recordId ? String(body.recordId) : null;
        const clientPublicId = body?.publicId ? String(body.publicId) : null;
        const clientFormName = body?.formName ? String(body.formName) : null;

        // Find the assignment for this form + customer (if any — webhook-only forms may not have one)
        const assignment = await prisma.formAssignment.findFirst({
            where: {
                formId,
                endCustomerId: session.endCustomerId,
            },
            include: {
                wizardRun: { select: { wipNumber: true, wipContext: true } },
                form: { select: { publicId: true, name: true } },
            },
        });

        if (assignment && assignment.status === 'pending') {
            await prisma.formAssignment.update({
                where: { id: assignment.id },
                data: { status: 'in_progress' },
            });
        }

        // Resolve wipNumber: DB value wins, fall back to client-provided (webhook-only forms)
        const wipNumber = assignment?.wizardRun?.wipNumber ?? clientWipNumber;
        const publicId = assignment?.form?.publicId ?? clientPublicId;
        const formName = assignment?.form?.name ?? clientFormName;

        // Fire "form started" webhook — best-effort, doesn't block the response
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: session.tenantId },
                select: { sharedSecret: true },
            });
            if (tenant && wipNumber) {
                const webhookBody = JSON.stringify({
                    wipNumber,
                    recordId: clientRecordId,
                    publicId,
                    formId,
                    formName,
                    assignmentId: assignment?.id ?? null,
                    customerEmail: session.email,
                    customerName: session.name ?? null,
                    tenantId: session.tenantId,
                    startedAt: new Date().toISOString(),
                });
                const hmac = createHmacSignature(webhookBody, tenant.sharedSecret);
                const res = await fetch(FORM_STARTED_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...buildSignatureHeaders(hmac),
                    },
                    body: webhookBody,
                    cache: 'no-store',
                });
                console.log('[Portal Start] form-started webhook responded:', res.status);
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    console.error('[Portal Start] webhook non-OK body:', text.slice(0, 500));
                }
            } else if (!wipNumber) {
                console.warn('[Portal Start] Skipping webhook — no wipNumber available');
            }
        } catch (webhookErr) {
            console.error('[Portal Start] webhook error:', webhookErr);
        }

        return NextResponse.json({
            success: true,
            status: assignment?.status === 'pending' ? 'in_progress' : (assignment?.status ?? 'in_progress'),
        });
    } catch (error) {
        console.error('[Portal Forms] Start error:', error);
        return NextResponse.json(
            { error: 'Failed to update form status' },
            { status: 500 }
        );
    }
}
