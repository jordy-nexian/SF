/**
 * POST /api/admin/wizard/[id]/assign
 * Stage 4: Assign the pre-filled form to an end user.
 * Creates or finds EndCustomer, creates FormAssignment,
 * sends invite/notification email.
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';
import { assignSchema, canTransition } from '@/lib/wizard-validation';
import { createAndSendMagicLink, sendFormInviteEmail } from '@/lib/magic-link';
import { generatePrefillToken, buildPrefillUrl } from '@/lib/prefill-token';
import { logAuditEvent } from '@/lib/audit';
import { createHmacSignature, buildSignatureHeaders } from '@/lib/hmac';
import * as api from '@/lib/api-response';

const FORM_CREATED_WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/24975e24-04f2-47f3-9d82-7c3978d0f0a8';
const FORMS_TABLE_WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/4d7a98e5-1af8-41b2-88ab-64e8c693345b';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden();
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = assignSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError('Invalid assignment data', parsed.error.format());
        }

        const { endCustomerEmail, endCustomerName, dueDate, sendInvite } = parsed.data;

        // Fetch wizard run
        const wizardRun = await prisma.wizardRun.findFirst({
            where: { id, tenantId: session.tenantId },
        });

        if (!wizardRun) {
            return api.notFound('Wizard run not found');
        }

        if (!canTransition(wizardRun.state, 'assigned')) {
            return api.badRequest(
                `Cannot assign in state "${wizardRun.state}". Complete prefill first.`
            );
        }

        if (!wizardRun.templateId || !wizardRun.pinnedVersionId) {
            return api.badRequest('Template and version must be selected before assignment.');
        }

        // Find the form that uses this template (to create the assignment)
        const form = await prisma.form.findFirst({
            where: {
                templateId: wizardRun.templateId,
                tenantId: session.tenantId,
            },
            select: { id: true, publicId: true, name: true },
        });

        if (!form) {
            return api.notFound('No form found for this template.');
        }

        // Parse wipContext early — needed for both EndCustomer naming and prefill token
        const wipContextRaw = wizardRun.wipContext as {
            companyName?: string;
            wipNumber?: string | number;
            metadata?: Record<string, unknown>;
        } | null;

        // Find or create EndCustomer
        // Use WIP company name as primary identifier, falling back to admin-provided name
        const email = endCustomerEmail.trim().toLowerCase();
        const wipCompanyName = (wipContextRaw?.companyName as string) || null;
        const effectiveName = wipCompanyName || endCustomerName?.trim() || null;
        let isNewCustomer = false;

        let endCustomer = await prisma.endCustomer.findUnique({
            where: {
                tenantId_email: {
                    tenantId: session.tenantId,
                    email,
                },
            },
        });

        if (!endCustomer) {
            endCustomer = await prisma.endCustomer.create({
                data: {
                    tenantId: session.tenantId,
                    email,
                    name: effectiveName,
                },
            });
            isNewCustomer = true;
        } else if (wipCompanyName && endCustomer.name !== wipCompanyName) {
            // Update to the WIP company name so the customer is associated
            // with the correct company for this assignment
            endCustomer = await prisma.endCustomer.update({
                where: { id: endCustomer.id },
                data: { name: wipCompanyName },
            });
        }

        // Find existing assignment either by customer+form pair or by this wizardRun.
        // wizardRunId is unique on FormAssignment, so if this wizard already produced
        // one (e.g. from a retry), we must reuse it instead of creating a duplicate.
        const existingAssignment = await prisma.formAssignment.findFirst({
            where: {
                OR: [
                    { endCustomerId: endCustomer.id, formId: form.id },
                    { wizardRunId: id },
                ],
            },
        });

        let assignment;
        if (existingAssignment) {
            // Re-assign: reset status and ensure it points at the current wizard run,
            // customer, and form (in case any of those changed across retries).
            assignment = await prisma.formAssignment.update({
                where: { id: existingAssignment.id },
                data: {
                    endCustomerId: endCustomer.id,
                    formId: form.id,
                    status: 'pending',
                    prefillData: wizardRun.prefillData || undefined,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    createdByUserId: session.userId,
                    wizardRunId: id,
                    completedAt: null,
                },
            });
        } else {
            assignment = await prisma.formAssignment.create({
                data: {
                    endCustomerId: endCustomer.id,
                    formId: form.id,
                    prefillData: wizardRun.prefillData || undefined,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    createdByUserId: session.userId,
                    wizardRunId: id,
                },
            });
        }

        // Generate stateless prefill token — all assignment context travels in the URL
        const prefillDataRaw = wizardRun.prefillData as Record<string, { value?: string }> | null;
        const tokenValues: Record<string, string> = {};
        if (prefillDataRaw) {
            for (const [tokenId, entry] of Object.entries(prefillDataRaw)) {
                if (entry?.value !== undefined && entry?.value !== null && entry.value !== '') {
                    tokenValues[tokenId] = String(entry.value);
                }
            }
        }

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        let formUrl: string | null = null;
        try {
            const prefillToken = await generatePrefillToken({
                publicId: form.publicId,
                tenantId: session.tenantId,
                tokenValues,
                customerEmail: email,
                customerName: endCustomerName?.trim(),
                wipNumber: wizardRun.wipNumber,
                wipContext: wipContextRaw ?? undefined,
            });
            formUrl = buildPrefillUrl(baseUrl, form.publicId, prefillToken);
        } catch (tokenError) {
            console.warn('[Wizard] Prefill token generation failed:', tokenError);
            // Fall back to magic link if token fails (e.g. payload too large)
        }

        // Send invite email — direct form link + portal link, or magic link as fallback
        let inviteSent = false;
        if (sendInvite) {
            try {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: session.tenantId },
                    select: { name: true },
                });

                let result: { success: boolean; error?: string };
                if (formUrl) {
                    // Send direct form invite (email template now also includes portal link)
                    result = await sendFormInviteEmail(email, formUrl, tenant?.name, session.tenantId);
                } else {
                    // Fallback: send magic link to portal
                    result = await createAndSendMagicLink(
                        endCustomer.id,
                        endCustomer.email,
                        tenant?.name
                    );
                }
                inviteSent = result.success;

                if (!result.success) {
                    console.warn('[Wizard] Invite email failed:', result.error);
                }
            } catch (emailError) {
                console.error('[Wizard] Email send error:', emailError);
                // Don't fail the assignment — email is best-effort
            }
        }

        // Update wizard run to completed
        await prisma.wizardRun.update({
            where: { id },
            data: {
                state: 'assigned',
                assignmentId: assignment.id,
                endCustomerId: endCustomer.id,
                inviteSent,
                completedAt: new Date(),
                errorMessage: null,
            },
        });

        // Audit log
        await logAuditEvent({
            tenantId: session.tenantId,
            userId: session.userId,
            action: 'wizard.assigned',
            resourceType: 'wizard',
            resourceId: id,
            metadata: {
                assignmentId: assignment.id,
                endCustomerEmail: email,
                isNewCustomer,
                inviteSent,
                formId: form.id,
                formName: form.name,
            },
        });

        // Notify QuickBase that a form has been assigned
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: session.tenantId },
                select: { sharedSecret: true },
            });
            if (tenant) {
                const metadata = wipContextRaw?.metadata ?? {};
                const orgIdValue = metadata.OrgID ?? metadata.OrgId ?? metadata.ORGNumber ?? null;
                const webhookBody = JSON.stringify({
                    publicId: form.publicId,
                    formName: form.name,
                    wipNumber: wizardRun.wipNumber,
                    orgId: orgIdValue === null ? null : String(orgIdValue),
                    companyName: wipContextRaw?.companyName ?? null,
                    wipMetadata: metadata,
                    customerEmail: email,
                    assignmentId: assignment.id,
                    tenantId: session.tenantId,
                    formValues: tokenValues,
                });
                const hmac = createHmacSignature(webhookBody, tenant.sharedSecret);
                console.log('[Wizard] Posting form-created webhook to QuickBase:', FORM_CREATED_WEBHOOK_URL);
                const res = await fetch(FORM_CREATED_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...buildSignatureHeaders(hmac),
                    },
                    body: webhookBody,
                    cache: 'no-store',
                });
                console.log('[Wizard] QuickBase form-created webhook responded:', res.status);
                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    console.error('[Wizard] QuickBase webhook non-OK body:', text.slice(0, 500));
                }

                // Also populate the QB forms table with this assignment
                try {
                    const formsTableBody = JSON.stringify({
                        customerEmail: email,
                        customerName: endCustomer.name || endCustomerName?.trim() || null,
                        companyName: wipContextRaw?.companyName ?? null,
                        orgId: orgIdValue === null ? null : String(orgIdValue),
                        wipNumber: wizardRun.wipNumber,
                        wipMetadata: metadata,
                        formName: form.name,
                        publicId: form.publicId,
                        formId: form.id,
                        assignmentId: assignment.id,
                        dueDate: dueDate || null,
                        tenantId: session.tenantId,
                        assignedAt: new Date().toISOString(),
                        formValues: tokenValues,
                    });
                    const formsHmac = createHmacSignature(formsTableBody, tenant.sharedSecret);
                    console.log('[Wizard] Posting to QB forms table:', FORMS_TABLE_WEBHOOK_URL);
                    const formsRes = await fetch(FORMS_TABLE_WEBHOOK_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...buildSignatureHeaders(formsHmac),
                        },
                        body: formsTableBody,
                        cache: 'no-store',
                    });
                    console.log('[Wizard] QB forms table webhook responded:', formsRes.status);
                    if (!formsRes.ok) {
                        const text = await formsRes.text().catch(() => '');
                        console.error('[Wizard] QB forms table webhook non-OK body:', text.slice(0, 500));
                    }
                } catch (formsErr) {
                    console.error('[Wizard] QB forms table webhook error:', formsErr);
                }
            } else {
                console.warn('[Wizard] Skipping QuickBase webhook — tenant not found');
            }
        } catch (webhookErr) {
            console.error('[Wizard] QuickBase form-created webhook error:', webhookErr);
        }

        return api.success({
            wizardRunId: id,
            state: 'assigned',
            assignment: {
                id: assignment.id,
                formId: form.id,
                formPublicId: form.publicId,
                endCustomer: {
                    id: endCustomer.id,
                    email: endCustomer.email,
                    name: endCustomer.name,
                    isNew: isNewCustomer,
                },
                status: 'pending',
                dueDate: dueDate || null,
            },
            invite: {
                sent: inviteSent,
                method: formUrl ? 'direct_link' : 'magic_link',
            },
            formUrl,
        }, 201);
    } catch (error) {
        console.error('[Wizard] Assign error:', error);
        return api.internalError('Failed to assign form');
    }
}
