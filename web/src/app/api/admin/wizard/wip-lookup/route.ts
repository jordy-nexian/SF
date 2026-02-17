/**
 * POST /api/admin/wizard/wip-lookup
 * Stage 1: Look up a WIP number via n8n → Quickbase.
 * Creates a new WizardRun record.
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireTenantSession } from '@/lib/auth-helpers';
import { wipLookupSchema } from '@/lib/wizard-validation';
import { lookupWip } from '@/lib/wizard-n8n';
import { logAuditEvent } from '@/lib/audit';
import * as api from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const session = await requireTenantSession();
        if (!session) return api.unauthorized();

        if (!['owner', 'admin'].includes(session.role)) {
            return api.forbidden('Only owners and admins can use the wizard');
        }

        const body = await request.json().catch(() => ({}));
        const parsed = wipLookupSchema.safeParse(body);
        if (!parsed.success) {
            return api.validationError('Invalid WIP number', parsed.error.format());
        }

        const { wipNumber } = parsed.data;

        // Get tenant config (webhook URL + secret)
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.tenantId },
            select: {
                wipLookupWebhookUrl: true,
                sharedSecret: true,
            },
        });

        if (!tenant?.wipLookupWebhookUrl) {
            return api.badRequest(
                'WIP lookup webhook is not configured. Set it in Settings → WIP Wizard Webhooks.'
            );
        }

        // Call n8n to look up WIP in Quickbase
        let wipContext;
        try {
            const n8nResponse = await lookupWip(
                tenant.wipLookupWebhookUrl,
                wipNumber,
                session.tenantId,
                tenant.sharedSecret
            );

            if (!n8nResponse.found) {
                return api.notFound(`WIP "${wipNumber}" not found in Quickbase`);
            }

            wipContext = {
                clientName: n8nResponse.clientName,
                projectName: n8nResponse.projectName,
                clientEmail: n8nResponse.clientEmail,
                metadata: n8nResponse.metadata,
            };
        } catch (error) {
            console.error('[Wizard] WIP lookup failed:', error);
            return api.gatewayError(
                error instanceof Error ? error.message : 'Failed to reach n8n. Please try again.'
            );
        }

        // Create WizardRun record
        const wizardRun = await prisma.wizardRun.create({
            data: {
                tenantId: session.tenantId,
                createdByUserId: session.userId,
                wipNumber,
                wipContext: wipContext as object,
                state: 'wip_lookup',
            },
        });

        // Audit log
        await logAuditEvent({
            tenantId: session.tenantId,
            userId: session.userId,
            action: 'wizard.created',
            resourceType: 'wizard',
            resourceId: wizardRun.id,
            metadata: { wipNumber },
        });

        return api.success({
            wizardRunId: wizardRun.id,
            wipNumber,
            wipContext,
        });
    } catch (error) {
        console.error('[Wizard] WIP lookup error:', error);
        return api.internalError('Failed to create wizard run');
    }
}
