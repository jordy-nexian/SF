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
import { generatePrefillToken, buildPrefillUrl } from '@/lib/prefill-token';

const WEBHOOK_URL = 'https://hooks.mercia.co.uk/webhook/81077ef9-b372-4780-9f78-92884f3a6e83';

// Extract a scalar from values like 123, "123", { value: 123 } (QB API shape)
function pickScalar(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
        const inner = (v as { value: unknown }).value;
        if (inner != null && (typeof inner === 'string' || typeof inner === 'number')) {
            return String(inner);
        }
    }
    return null;
}

function pickKey(obj: Record<string, unknown>, ...keys: string[]): string | null {
    for (const k of keys) {
        const val = pickScalar(obj[k]);
        if (val != null) return val;
    }
    return null;
}

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
            select: { sharedSecret: true, customerWebhookUrl: true },
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

        // Look up an EndCustomer for this company so we can generate ctx prefill tokens
        // matching the portal flow (ctx tokens require a customerEmail).
        const endCustomer = await prisma.endCustomer.findFirst({
            where: {
                tenantId: session.user.tenantId,
                name: companyName,
            },
            select: { email: true, name: true },
            orderBy: { createdAt: 'desc' },
        });

        // Load forms using the tenant's customer webhook — same one the end-user portal calls.
        // n8n filters by email/companyName and returns the forms list.
        let webhookForms: Array<{
            formName: string | null;
            publicId: string | null;
            status: string | null;
            dueDate: string | null;
            completedAt: string | null;
            wipNumber: string | null;
            recordId: string | null;
            customerEmail: string | null;
            formUrl: string | null;
        }> = [];

        if (tenant.customerWebhookUrl) {
            try {
                const formsBody = JSON.stringify({
                    email: endCustomer?.email ?? null,
                    companyName,
                });
                const formsHmac = createHmacSignature(formsBody, tenant.sharedSecret);
                const formsResponse = await fetch(tenant.customerWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...buildSignatureHeaders(formsHmac),
                    },
                    body: formsBody,
                    cache: 'no-store',
                });

                if (formsResponse.ok) {
                    const formsRawBody = await formsResponse.text();
                    const formsSigHeaders = extractSignatureHeaders(formsResponse);
                    if (formsSigHeaders) {
                        const formsVerification = verifyHmacSignature(formsRawBody, formsSigHeaders, tenant.sharedSecret);
                        if (!formsVerification.valid) {
                            console.warn('[Company Forms] Signature mismatch — proceeding anyway:', formsVerification.error);
                        }
                    }

                    // Parse — handle plain array, wrapped { body: "json-string" }, or { data: [...] }
                    let rawForms: Record<string, unknown>[] = [];
                    const parsed = JSON.parse(formsRawBody) as unknown;
                    if (Array.isArray(parsed) && parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>)?.body === 'string') {
                        rawForms = JSON.parse((parsed[0] as { body: string }).body);
                    } else if (parsed && typeof parsed === 'object' && typeof (parsed as { body?: unknown }).body === 'string') {
                        rawForms = JSON.parse((parsed as { body: string }).body);
                    } else if (Array.isArray(parsed)) {
                        rawForms = parsed as Record<string, unknown>[];
                    } else if (parsed && typeof parsed === 'object') {
                        const obj = parsed as Record<string, unknown>;
                        if (Array.isArray(obj.data)) rawForms = obj.data as Record<string, unknown>[];
                        else if (Array.isArray(obj.forms)) rawForms = obj.forms as Record<string, unknown>[];
                        else rawForms = [obj];
                    }

                    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
                    webhookForms = await Promise.all(rawForms.map(async (wf) => {
                        const publicId = pickKey(wf, 'publicId', 'PublicId', 'PublicID');
                        const wipNumber = pickKey(wf, 'wipNumber', 'WIPNumber', 'wip_number');
                        const recordId = pickKey(wf, 'recordId', 'FORM_RECORD_ID', 'formRecordId', 'form_record_id');
                        const customerEmail = pickKey(wf, 'customerEmail', 'Email', 'email') ?? endCustomer?.email ?? null;

                        let formUrl: string | null = null;
                        if (publicId && wipNumber && customerEmail) {
                            try {
                                const token = await generatePrefillToken({
                                    publicId,
                                    tenantId: session.user.tenantId,
                                    tokenValues: {},
                                    customerEmail,
                                    customerName: endCustomer?.name || companyName,
                                    wipNumber,
                                });
                                formUrl = buildPrefillUrl(baseUrl, publicId, token);
                            } catch {
                                // fall through — table still shows the row without a link
                            }
                        }

                        return {
                            formName: pickKey(wf, 'formName', 'FormName'),
                            publicId,
                            status: pickKey(wf, 'status', 'Status'),
                            dueDate: pickKey(wf, 'dueDate', 'DueDate'),
                            completedAt: pickKey(wf, 'completedAt', 'CompletedAt'),
                            wipNumber,
                            recordId,
                            customerEmail,
                            formUrl,
                        };
                    }));
                } else {
                    console.error('[Company Forms] Webhook returned', formsResponse.status);
                }
            } catch (formsErr) {
                console.error('[Company Forms] Error fetching forms:', formsErr);
            }
        } else {
            console.warn('[Company Forms] No customerWebhookUrl configured on tenant — skipping forms load');
        }

        return NextResponse.json({
            company: {
                id,
                companyName,
                orgNumber,
                sourceCount: matchingRecords.length,
            },
            records: matchingRecords,
            assignments: webhookForms,
        });
    } catch (error) {
        console.error('[Company Detail] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch company details' }, { status: 500 });
    }
}
