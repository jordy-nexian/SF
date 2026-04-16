import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';
import {
    createHmacSignature,
    buildSignatureHeaders,
    extractSignatureHeaders,
    verifyHmacSignature,
} from '@/lib/hmac';

const WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/81077ef9-b372-4780-9f78-92884f3a6e83';

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company';
}

function extractRecords(raw: unknown): Record<string, unknown>[] {
    if (Array.isArray(raw)) {
        return raw
            .map((entry) => {
                if (entry && typeof entry === 'object' && 'data' in entry && Array.isArray((entry as Record<string, unknown>).data)) {
                    return (entry as Record<string, unknown>).data as Record<string, unknown>[];
                }
                if (entry && typeof entry === 'object' && 'values' in entry && (entry as Record<string, unknown>).values) {
                    return (entry as Record<string, unknown>).values as Record<string, unknown>;
                }
                if (entry && typeof entry === 'object') {
                    return entry as Record<string, unknown>;
                }
                return null;
            })
            .flat()
            .filter((entry): entry is Record<string, unknown> => Boolean(entry));
    }
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if ('data' in obj && Array.isArray(obj.data)) {
            return obj.data as Record<string, unknown>[];
        }
        if ('values' in obj && obj.values) {
            return [obj.values as Record<string, unknown>];
        }
    }
    return [];
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

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
            console.error('[Company Detail] Upstream error:', response.status);
            return NextResponse.json({ error: 'Webhook request failed' }, { status: 502 });
        }

        const rawBody = await response.text();
        const sigHeaders = extractSignatureHeaders(response);
        if (!sigHeaders) {
            return NextResponse.json(
                { error: 'Webhook response missing HMAC signature headers' },
                { status: 502 }
            );
        }

        const verification = verifyHmacSignature(rawBody, sigHeaders, tenant.sharedSecret);
        if (!verification.valid) {
            return NextResponse.json(
                { error: verification.error || 'Webhook response signature verification failed' },
                { status: 502 }
            );
        }

        const data = JSON.parse(rawBody) as unknown;
        const allRecords = extractRecords(data);

        // Filter records belonging to this company ID
        const matchingRecords = allRecords.filter((record) => {
            const companyName = typeof record.CompanyName === 'string' ? record.CompanyName.trim() : '';
            if (!companyName) return false;

            const orgIdValue = record.OrgId ?? record.ORGNumber;
            const orgNumber =
                orgIdValue === undefined || orgIdValue === null
                    ? null
                    : String(orgIdValue).trim();

            const recordId = orgNumber ? `org-${orgNumber}` : `company-${slugify(companyName)}`;
            return recordId === id;
        });

        if (matchingRecords.length === 0) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        const first = matchingRecords[0];
        const companyName = typeof first.CompanyName === 'string' ? first.CompanyName.trim() : '';
        const orgIdValue = first.OrgId ?? first.ORGNumber;
        const orgNumber =
            orgIdValue === undefined || orgIdValue === null ? null : String(orgIdValue).trim();

        // Look up EndCustomers linked to this company via externalId = orgNumber,
        // then pull their form assignments so the detail page can show sent forms.
        const assignments: {
            customerId: string;
            customerName: string | null;
            customerEmail: string;
            assignmentId: string;
            formName: string;
            formPublicId: string;
            status: string;
            dueDate: string | null;
            completedAt: string | null;
        }[] = [];

        if (orgNumber) {
            const customers = await prisma.endCustomer.findMany({
                where: { tenantId: session.user.tenantId, externalId: orgNumber },
                include: {
                    assignments: {
                        include: {
                            form: { select: { name: true, publicId: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            for (const customer of customers) {
                for (const a of customer.assignments) {
                    assignments.push({
                        customerId: customer.id,
                        customerName: customer.name,
                        customerEmail: customer.email,
                        assignmentId: a.id,
                        formName: a.form.name,
                        formPublicId: a.form.publicId,
                        status: a.status,
                        dueDate: a.dueDate?.toISOString() ?? null,
                        completedAt: a.completedAt?.toISOString() ?? null,
                    });
                }
            }
        }

        return NextResponse.json({
            company: {
                id,
                companyName,
                orgNumber,
                sourceCount: matchingRecords.length,
            },
            records: matchingRecords,
            assignments,
        });
    } catch (error) {
        console.error('[Company Detail] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch company details' }, { status: 500 });
    }
}
