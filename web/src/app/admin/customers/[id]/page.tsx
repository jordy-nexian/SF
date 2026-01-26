import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import CustomerClient from "./CustomerClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function CustomerDetailsPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        return <div className="p-8 text-center text-slate-500">Not authenticated</div>;
    }

    const { id } = await params;

    // Fetch customer with assignments
    const customer = await prisma.endCustomer.findFirst({
        where: { id, tenantId },
        include: {
            assignments: {
                include: {
                    form: {
                        select: { name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });

    if (!customer) {
        return <div className="p-8 text-center text-slate-500">Customer not found</div>;
    }

    // Fetch available forms for assignment dropdown
    const forms = await prisma.form.findMany({
        where: { tenantId, status: 'live' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });

    // Transform data for client component
    const serializedCustomer = {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        externalId: customer.externalId,
        assignments: customer.assignments.map(a => ({
            id: a.id,
            formId: a.formId,
            formName: a.form.name,
            status: a.status,
            dueDate: a.dueDate?.toISOString() || null,
            completedAt: a.completedAt?.toISOString() || null,
        })),
    };

    return (
        <div className="mx-auto max-w-5xl">
            <CustomerClient
                initialCustomer={serializedCustomer}
                tenantForms={forms}
            />
        </div>
    );
}
