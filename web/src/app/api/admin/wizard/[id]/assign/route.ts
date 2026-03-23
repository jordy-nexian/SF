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
import * as api from '@/lib/api-response';

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

        // Find or create EndCustomer
        const email = endCustomerEmail.trim().toLowerCase();
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
                    name: endCustomerName?.trim() || null,
                },
            });
            isNewCustomer = true;
        }

        // Check for existing assignment
        const existingAssignment = await prisma.formAssignment.findUnique({
            where: {
                endCustomerId_formId: {
                    endCustomerId: endCustomer.id,
                    formId: form.id,
                },
            },
        });

        if (existingAssignment) {
            return api.conflict('This form is already assigned to this customer', {
                assignmentId: existingAssignment.id,
            });
        }

        // Create FormAssignment with wizard's prefill data
        const assignment = await prisma.formAssignment.create({
            data: {
                endCustomerId: endCustomer.id,
                formId: form.id,
                prefillData: wizardRun.prefillData || undefined,
                dueDate: dueDate ? new Date(dueDate) : null,
                createdByUserId: session.userId,
                wizardRunId: id,
            },
        });

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
            });
            formUrl = buildPrefillUrl(baseUrl, form.publicId, prefillToken);
        } catch (tokenError) {
            console.warn('[Wizard] Prefill token generation failed:', tokenError);
            // Fall back to magic link if token fails (e.g. payload too large)
        }

        // Send invite email — direct form link if available, magic link as fallback
        let inviteSent = false;
        if (sendInvite) {
            try {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: session.tenantId },
                    select: { name: true },
                });

                let result: { success: boolean; error?: string };
                if (formUrl) {
                    result = await sendFormInviteEmail(email, formUrl, tenant?.name);
                } else {
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
