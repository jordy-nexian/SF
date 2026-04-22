/**
 * GET /api/portal/forms
 * List all forms assigned to the current portal user.
 * Supports both database mode and webhook mode (e.g., Quickbase integration).
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
    verifyPortalSession,
    PORTAL_SESSION_COOKIE
} from '@/lib/portal-auth';
import {
    createHmacSignature,
    buildSignatureHeaders,
    extractSignatureHeaders,
    verifyHmacSignature,
} from '@/lib/hmac';
import { generatePrefillToken, buildPrefillUrl } from '@/lib/prefill-token';

// Webhook response shape (same as admin customer page)
interface WebhookFormData {
    formName: string;
    status: string;
    publicId: string;
    wipNumber?: string | number | null;
    recordId?: string | number | null;
    dueDate?: string | null;
    completedAt?: string | null;
}

// Map webhook status strings to our enum format
function mapWebhookStatus(status: string): 'pending' | 'in_progress' | 'completed' {
    const normalized = status.toLowerCase().replace(/\s+/g, '_');
    if (normalized === 'completed') return 'completed';
    if (normalized === 'in_progress') return 'in_progress';
    return 'pending'; // "not started" → pending
}

export async function GET() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(PORTAL_SESSION_COOKIE);

        if (!sessionCookie?.value) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const session = await verifyPortalSession(sessionCookie.value);

        if (!session) {
            return NextResponse.json(
                { error: 'Invalid session' },
                { status: 401 }
            );
        }

        // Get tenant configuration to check for webhook
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.tenantId },
            select: { customerWebhookUrl: true, sharedSecret: true },
        });

        // Get customer details for webhook lookup
        const customer = await prisma.endCustomer.findUnique({
            where: { id: session.endCustomerId },
            select: { email: true, name: true },
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Always query DB assignments (wizard-created assignments live here)
        const assignments = await prisma.formAssignment.findMany({
            where: {
                endCustomerId: session.endCustomerId,
            },
            include: {
                form: {
                    select: {
                        id: true,
                        publicId: true,
                        name: true,
                        status: true,
                        thankYouMessage: true,
                    },
                },
                wizardRun: { select: { wipNumber: true } },
            },
            orderBy: [
                { status: 'asc' }, // pending first, then in_progress, then completed
                { createdAt: 'desc' },
            ],
        });

        // All assigned forms should be visible — the assignment itself is the access gate
        const dbForms = assignments.map(a => ({
            assignmentId: a.id,
            formId: a.form.id,
            publicId: a.form.publicId,
            name: a.form.name,
            status: a.status as string,
            dueDate: a.dueDate?.toISOString() || null,
            completedAt: a.completedAt?.toISOString() || null,
            createdAt: a.createdAt.toISOString(),
            wipNumber: a.wizardRun?.wipNumber ?? null,
        }));

        // If tenant has webhook configured, fetch from external source and merge
        let webhookForms: typeof dbForms = [];
        let source = 'database';

        if (tenant?.customerWebhookUrl) {
            try {
                const requestBody = JSON.stringify({
                    email: customer.email,
                    companyName: customer.name || null,
                });
                const hmac = createHmacSignature(requestBody, tenant.sharedSecret);
                const signatureHeaders = buildSignatureHeaders(hmac);

                const response = await fetch(tenant.customerWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...signatureHeaders,
                    },
                    body: requestBody,
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Webhook returned ${response.status}`);
                }

                // Verify inbound HMAC signature (warn only — n8n may not sign responses)
                const rawBody = await response.text();
                const sigHeaders = extractSignatureHeaders(response);
                if (!sigHeaders) {
                    console.warn('[Portal Forms] n8n response has no signature headers — skipping verification');
                } else {
                    const verification = verifyHmacSignature(rawBody, sigHeaders, tenant.sharedSecret);
                    if (!verification.valid) {
                        console.warn('[Portal Forms] n8n response signature mismatch — proceeding anyway:', verification.error);
                    }
                }

                // Parse body — handle both plain array and n8n's wrapped format: [{ body: "stringified-json" }]
                let webhookData: WebhookFormData[];
                const parsed = JSON.parse(rawBody);
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0]?.body === 'string') {
                    webhookData = JSON.parse(parsed[0].body);
                } else if (parsed && typeof parsed === 'object' && typeof (parsed as { body?: unknown }).body === 'string') {
                    webhookData = JSON.parse((parsed as { body: string }).body);
                } else {
                    webhookData = parsed;
                }

                // Transform webhook data to match expected format, generating ctx tokens where WIP is available
                const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                webhookForms = await Promise.all(webhookData.map(async (wf, index) => {
                    let formUrl: string | undefined;
                    if (wf.wipNumber) {
                        try {
                            const token = await generatePrefillToken({
                                publicId: wf.publicId,
                                tenantId: session.tenantId,
                                tokenValues: {},
                                customerEmail: customer.email,
                                customerName: customer.name || undefined,
                                wipNumber: String(wf.wipNumber),
                            });
                            formUrl = buildPrefillUrl(baseUrl, wf.publicId, token);
                        } catch {
                            // fall back to plain URL if token generation fails
                        }
                    }
                    return {
                        assignmentId: `webhook-${index}`,
                        formId: wf.publicId,
                        publicId: wf.publicId,
                        name: wf.formName,
                        status: mapWebhookStatus(wf.status),
                        dueDate: wf.dueDate || null,
                        completedAt: wf.completedAt || null,
                        createdAt: new Date().toISOString(),
                        formUrl,
                        wipNumber: wf.wipNumber != null ? String(wf.wipNumber) : null,
                        recordId: wf.recordId != null ? String(wf.recordId) : null,
                    };
                }));

                source = 'merged';
            } catch (error) {
                console.error('[Portal Forms] Webhook fetch failed:', error);
                // Continue with DB-only results
            }
        }

        // Merge: start with webhook forms, then add DB-only forms (dedup by publicId)
        const seenPublicIds = new Set(webhookForms.map(f => f.publicId));
        const dbOnlyForms = dbForms.filter(f => !seenPublicIds.has(f.publicId));
        const mergedForms = [...webhookForms, ...dbOnlyForms];

        return NextResponse.json({
            forms: mergedForms,
            total: mergedForms.length,
            source,
        });
    } catch (error) {
        console.error('[Portal Forms] List error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch forms' },
            { status: 500 }
        );
    }
}
