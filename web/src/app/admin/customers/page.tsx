import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { AdminSummaryCard } from "./components";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
                Not authenticated
            </div>
        );
    }

    const customers = await prisma.endCustomer.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { assignments: true },
            },
        },
    });

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Fund Coordinators</h1>
                    <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                        Manage portal users and assign templates.
                    </p>
                </div>
                <Link
                    href="/admin/customers/new"
                    className="rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.2)]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    style={{
                        background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                    }}
                >
                    + Add Fund Coordinator
                </Link>
            </div>

            {/* Summary Card with Donut */}
            <AdminSummaryCard />

            {/* Customers Table */}
            <div
                className="overflow-hidden rounded-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <table className="min-w-full text-left text-sm">
                    <thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <tr>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Name</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Email</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Assigned Forms</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Joined</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers.map((c) => (
                            <tr key={c.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <td className="px-5 py-4 font-medium text-white">
                                    <Link
                                        href={`/admin/customers/${c.id}`}
                                        className="hover:text-indigo-400 transition-colors"
                                    >
                                        {c.name || '—'}
                                    </Link>
                                </td>
                                <td className="px-5 py-4" style={{ color: '#cbd5e1' }}>
                                    {c.email}
                                </td>
                                <td className="px-5 py-4">
                                    <span
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                        style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}
                                    >
                                        {c._count.assignments} active
                                    </span>
                                </td>
                                <td className="px-5 py-4" style={{ color: '#64748b' }}>
                                    {new Date(c.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-5 py-4 text-right">
                                    <Link
                                        href={`/admin/customers/${c.id}`}
                                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                                    >
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {customers.length === 0 && (
                            <tr>
                                <td className="px-5 py-12 text-center" colSpan={5} style={{ color: '#64748b' }}>
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                        </div>
                                        <p>No fund coordinators yet. Invite one to get started.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
