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

// Webhook response shape (same as admin customer page)
interface WebhookFormData {
    formName: string;
    status: string;
    publicId: string;
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
            select: { customerWebhookUrl: true },
        });

        // Get customer email for webhook lookup
        const customer = await prisma.endCustomer.findUnique({
            where: { id: session.endCustomerId },
            select: { email: true },
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // If tenant has webhook configured, fetch from external source
        if (tenant?.customerWebhookUrl) {
            try {
                const response = await fetch(tenant.customerWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: customer.email }),
                    cache: 'no-store',
                });

                if (!response.ok) {
                    throw new Error(`Webhook returned ${response.status}`);
                }

                const webhookData: WebhookFormData[] = await response.json();

                // Transform webhook data to match expected format
                const forms = webhookData.map((wf, index) => ({
                    assignmentId: `webhook-${index}`,
                    formId: wf.publicId,
                    publicId: wf.publicId,
                    name: wf.formName,
                    status: mapWebhookStatus(wf.status),
                    dueDate: wf.dueDate || null,
                    completedAt: wf.completedAt || null,
                    createdAt: new Date().toISOString(),
                }));

                return NextResponse.json({
                    forms,
                    total: forms.length,
                    source: 'webhook', // Indicate data source for debugging
                });
            } catch (error) {
                console.error('[Portal Forms] Webhook fetch failed:', error);
                // Fall through to database fallback
            }
        }

        // Database fallback: Get all form assignments for this end customer
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
            },
            orderBy: [
                { status: 'asc' }, // pending first, then in_progress, then completed
                { createdAt: 'desc' },
            ],
        });

        // Filter to only show live forms
        const activeForms = assignments
            .filter(a => a.form.status === 'live')
            .map(a => ({
                assignmentId: a.id,
                formId: a.form.id,
                publicId: a.form.publicId,
                name: a.form.name,
                status: a.status,
                dueDate: a.dueDate?.toISOString() || null,
                completedAt: a.completedAt?.toISOString() || null,
                createdAt: a.createdAt.toISOString(),
            }));

        return NextResponse.json({
            forms: activeForms,
            total: activeForms.length,
            source: 'database', // Indicate data source for debugging
        });
    } catch (error) {
        console.error('[Portal Forms] List error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch forms' },
            { status: 500 }
        );
    }
}
