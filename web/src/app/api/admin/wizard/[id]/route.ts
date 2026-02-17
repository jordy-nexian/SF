/**
 * GET   /api/admin/wizard/[id] — Get wizard run details
 * PATCH /api/admin/wizard/[id] — Update wizard (template selection)
 * DELETE /api/admin/wizard/[id] — Cancel wizard run
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';
import { templateSelectSchema, canTransition } from '@/lib/wizard-validation';
import { logAuditEvent } from '@/lib/audit';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET — Fetch a single wizard run with full details
export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden();
        }

        const { id } = await params;

        const wizardRun = await prisma.wizardRun.findFirst({
            where: { id, tenantId: session.tenantId },
            include: {
                createdBy: { select: { id: true, email: true } },
                template: { select: { id: true, name: true, extractedTokens: true } },
                pinnedVersion: { select: { id: true, versionNumber: true, htmlContent: true } },
                endCustomer: { select: { id: true, email: true, name: true } },
                assignment: { select: { id: true, status: true, dueDate: true } },
            },
        });

        if (!wizardRun) {
            return api.notFound('Wizard run not found');
        }

        return api.success({
            id: wizardRun.id,
            wipNumber: wizardRun.wipNumber,
            wipContext: wizardRun.wipContext,
            state: wizardRun.state,
            template: wizardRun.template,
            pinnedVersion: wizardRun.pinnedVersion ? {
                id: wizardRun.pinnedVersion.id,
                versionNumber: wizardRun.pinnedVersion.versionNumber,
            } : null,
            prefillData: wizardRun.prefillData,
            prefillSource: wizardRun.prefillSource,
            endCustomer: wizardRun.endCustomer,
            assignment: wizardRun.assignment ? {
                id: wizardRun.assignment.id,
                status: wizardRun.assignment.status,
                dueDate: wizardRun.assignment.dueDate?.toISOString() || null,
            } : null,
            inviteSent: wizardRun.inviteSent,
            errorMessage: wizardRun.errorMessage,
            createdBy: wizardRun.createdBy,
            createdAt: wizardRun.createdAt.toISOString(),
            updatedAt: wizardRun.updatedAt.toISOString(),
            completedAt: wizardRun.completedAt?.toISOString() || null,
        });
    } catch (error) {
        console.error('[Wizard] Get error:', error);
        return api.internalError('Failed to fetch wizard run');
    }
}

// PATCH — Stage 2: Select template and pin version
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden();
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const parsed = templateSelectSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError('Invalid template selection', parsed.error.format());
        }

        // Fetch wizard run
        const wizardRun = await prisma.wizardRun.findFirst({
            where: { id, tenantId: session.tenantId },
        });

        if (!wizardRun) {
            return api.notFound('Wizard run not found');
        }

        // Validate state transition
        if (!canTransition(wizardRun.state, 'template_selected')) {
            return api.badRequest(
                `Cannot select template in state "${wizardRun.state}". Expected "wip_lookup" or "template_selected".`
            );
        }

        // Fetch template and verify it belongs to this tenant
        const template = await prisma.htmlTemplate.findFirst({
            where: {
                id: parsed.data.templateId,
                tenantId: session.tenantId,
            },
            include: {
                mappings: true,
                forms: {
                    where: { currentVersionId: { not: null } },
                    select: { currentVersionId: true },
                    take: 1,
                },
            },
        });

        if (!template) {
            return api.notFound('Template not found');
        }

        // Find a form that uses this template to get the pinned version
        // If no form uses it yet, we can't pin a version
        const formUsingTemplate = await prisma.form.findFirst({
            where: {
                templateId: template.id,
                tenantId: session.tenantId,
                currentVersionId: { not: null },
            },
            select: {
                id: true,
                currentVersionId: true,
                currentVersion: {
                    select: { id: true, versionNumber: true },
                },
            },
        });

        if (!formUsingTemplate?.currentVersionId) {
            return api.badRequest(
                'No published form version found for this template. Publish a form using this template first.'
            );
        }

        // Update wizard run
        const updated = await prisma.wizardRun.update({
            where: { id },
            data: {
                templateId: template.id,
                pinnedVersionId: formUsingTemplate.currentVersionId,
                state: 'template_selected',
                errorMessage: null,
            },
        });

        // Audit log
        await logAuditEvent({
            tenantId: session.tenantId,
            userId: session.userId,
            action: 'wizard.template_selected',
            resourceType: 'wizard',
            resourceId: id,
            metadata: {
                templateId: template.id,
                templateName: template.name,
                pinnedVersionId: formUsingTemplate.currentVersionId,
            },
        });

        // Build token list for the response
        const tokens = template.mappings.map((m) => ({
            tokenId: m.tokenId,
            label: m.tokenLabel,
            key: m.payloadKey,
            mode: m.mode,
        }));

        return api.success({
            wizardRunId: updated.id,
            templateId: template.id,
            templateName: template.name,
            pinnedVersionId: formUsingTemplate.currentVersionId,
            tokenCount: tokens.length,
            tokens,
            state: updated.state,
        });
    } catch (error) {
        console.error('[Wizard] Template select error:', error);
        return api.internalError('Failed to select template');
    }
}

// DELETE — Cancel wizard run
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden();
        }

        const { id } = await params;

        const wizardRun = await prisma.wizardRun.findFirst({
            where: { id, tenantId: session.tenantId },
        });

        if (!wizardRun) {
            return api.notFound('Wizard run not found');
        }

        if (wizardRun.state === 'assigned') {
            return api.badRequest('Cannot cancel a completed wizard run');
        }

        if (wizardRun.state === 'cancelled') {
            return api.badRequest('Wizard run is already cancelled');
        }

        await prisma.wizardRun.update({
            where: { id },
            data: { state: 'cancelled' },
        });

        await logAuditEvent({
            tenantId: session.tenantId,
            userId: session.userId,
            action: 'wizard.cancelled',
            resourceType: 'wizard',
            resourceId: id,
        });

        return api.success({ cancelled: true });
    } catch (error) {
        console.error('[Wizard] Cancel error:', error);
        return api.internalError('Failed to cancel wizard run');
    }
}
