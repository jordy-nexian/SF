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

interface RawCompanyRecord {
    values?: RawCompanyRecord;
    data?: RawCompanyRecord[];
    CompanyName?: string;
    OrgId?: string | number;
    ORGNumber?: string | number;
}

interface NormalizedCompany {
    id: string;
    companyName: string;
    orgNumber: string | null;
    sourceCount: number;
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company';
}

function normalizeWebhookCompanies(raw: unknown): NormalizedCompany[] {
    let records: RawCompanyRecord[] = [];

    if (Array.isArray(raw)) {
        records = raw
            .map((entry) => {
                if (entry && typeof entry === 'object' && 'data' in entry && Array.isArray(entry.data)) {
                    return entry.data;
                }

                if (entry && typeof entry === 'object' && 'values' in entry && entry.values && typeof entry.values === 'object') {
                    return entry.values as RawCompanyRecord;
                }

                if (entry && typeof entry === 'object') {
                    return entry as RawCompanyRecord;
                }

                return null;
            })
            .flat()
            .filter((entry): entry is RawCompanyRecord => Boolean(entry));
    } else if (raw && typeof raw === 'object' && 'data' in raw && Array.isArray(raw.data)) {
        records = raw.data as RawCompanyRecord[];
    } else if (raw && typeof raw === 'object' && 'values' in raw && raw.values && typeof raw.values === 'object') {
        records = [raw.values as RawCompanyRecord];
    }

    const uniqueCompanies = new Map<string, NormalizedCompany>();

    for (const record of records) {
        const companyName = typeof record.CompanyName === 'string' ? record.CompanyName.trim() : '';
        if (!companyName) {
            continue;
        }

        const orgIdValue = record.OrgId ?? record.ORGNumber;
        const orgNumber = orgIdValue === undefined || orgIdValue === null
            ? null
            : String(orgIdValue).trim();

        const dedupeKey = orgNumber || companyName.toLowerCase();
        const existing = uniqueCompanies.get(dedupeKey);

        if (!existing) {
            uniqueCompanies.set(dedupeKey, {
                id: orgNumber ? `org-${orgNumber}` : `company-${slugify(companyName)}`,
                companyName,
                orgNumber,
                sourceCount: 1,
            });
        } else {
            existing.sourceCount += 1;
        }
    }

    return Array.from(uniqueCompanies.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
}

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

        return NextResponse.json({ customers: normalizeWebhookCompanies(data) });
    } catch (error) {
        console.error('[Customers Webhook] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}
