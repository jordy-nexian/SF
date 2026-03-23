import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import CustomerClient from "./CustomerClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

// Webhook response shape from Quickbase
interface WebhookFormData {
    formName: string;
    status: string;
    publicId: string;
}

// Map webhook status strings to our enum format
function mapWebhookStatus(status: string): 'pending' | 'in_progress' | 'completed' {
    const normalized = status.toLowerCase().replace(/\s+/g, '_');
    if (normalized === 'completed') return 'completed';
    if (normalized === 'in_progress') return 'in_progress';
    return 'pending'; // "not started" → pending
}

export default async function CustomerDetailsPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        return <div className="p-8 text-center text-slate-500">Not authenticated</div>;
    }

    const { id } = await params;

    // Fetch customer basic info
    const customer = await prisma.endCustomer.findFirst({
        where: { id, tenantId },
    });

    if (!customer) {
        return <div className="p-8 text-center text-slate-500">Fund coordinator not found</div>;
    }

    // Fetch tenant to check for webhook configuration
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customerWebhookUrl: true },
    });

    // Customer shape for the client component
    interface CustomerData {
        id: string;
        email: string;
        name: string | null;
        externalId: string | null;
        assignments: Array<{
            id: string;
            formId: string;
            formName: string;
            status: 'pending' | 'in_progress' | 'completed';
            dueDate: string | null;
            completedAt: string | null;
            publicId?: string;
        }>;
    }

    // Initialize with default (will be populated below)
    let serializedCustomer: CustomerData = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        externalId: customer.externalId,
        assignments: [],
    };
    let useWebhook = false;
    let webhookError: string | null = null;

    // If webhook URL is configured, fetch from external source
    if (tenant?.customerWebhookUrl) {
        try {
            const response = await fetch(tenant.customerWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: customer.email }),
                // No cache during testing
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(`Webhook returned ${response.status}`);
            }

            const webhookData: WebhookFormData[] = await response.json();
            useWebhook = true;

            // Transform webhook data to match existing interface
            serializedCustomer = {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                externalId: customer.externalId,
                assignments: webhookData.map((wf, index) => ({
                    id: `webhook-${index}`, // Synthetic ID for webhook data
                    formId: wf.publicId, // Use publicId as formId for linking
                    formName: wf.formName,
                    status: mapWebhookStatus(wf.status),
                    dueDate: null, // Webhook doesn't provide this yet
                    completedAt: null, // Webhook doesn't provide this yet
                    publicId: wf.publicId, // For direct form link
                })),
            };
        } catch (error) {
            console.error('Failed to fetch from customer webhook:', error);
            webhookError = error instanceof Error ? error.message : 'Unknown error';
            // Fall through to DB fallback
        }
    }

    // Fallback to database if no webhook or webhook failed
    if (!useWebhook) {
        const customerWithAssignments = await prisma.endCustomer.findFirst({
            where: { id, tenantId },
            include: {
                assignments: {
                    include: {
                        form: {
                            select: { name: true, publicId: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        serializedCustomer = {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            externalId: customer.externalId,
            assignments: (customerWithAssignments?.assignments || []).map((a: {
                id: string;
                formId: string;
                form: { name: string; publicId: string };
                status: 'pending' | 'in_progress' | 'completed';
                dueDate: Date | null;
                completedAt: Date | null;
            }) => ({
                id: a.id,
                formId: a.formId,
                formName: a.form.name,
                status: a.status,
                dueDate: a.dueDate?.toISOString() || null,
                completedAt: a.completedAt?.toISOString() || null,
                publicId: a.form.publicId,
            })),
        };
    }

    // Fetch available forms for assignment dropdown (only needed for DB mode)
    const forms = useWebhook ? [] : await prisma.form.findMany({
        where: { tenantId, status: 'live' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });

    return (
        <div className="mx-auto max-w-5xl">
            {webhookError && (
                <div className="mb-4 rounded-lg bg-amber-900/50 border border-amber-700 p-4 text-amber-200 text-sm">
                    <strong>Webhook error:</strong> {webhookError}. Showing database data instead.
                </div>
            )}
            <CustomerClient
                initialCustomer={serializedCustomer}
                tenantForms={forms}
                isWebhookMode={useWebhook}
            />
        </div>
    );
}
