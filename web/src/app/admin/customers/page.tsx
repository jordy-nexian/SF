"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CompanyRow {
    id: string;
    companyName: string;
    orgNumber: string | null;
    sourceCount: number;
}

export default function CustomersPage() {
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCustomers() {
            try {
                const res = await fetch("/api/admin/customers/webhook");
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Request failed (${res.status})`);
                }

                const data = await res.json();
                const rows: CompanyRow[] = Array.isArray(data.customers) ? data.customers : [];
                setCompanies(rows);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load companies");
            } finally {
                setLoading(false);
            }
        }

        fetchCustomers();
    }, []);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Companies</h1>
                <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
                    Unique companies grouped from the webhook response.
                </p>
            </div>

            <div
                className="overflow-hidden rounded-xl"
                style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex items-center gap-3" style={{ color: "#94a3b8" }}>
                            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading companies...
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-full"
                            style={{ background: "rgba(239, 68, 68, 0.1)" }}
                        >
                            <svg className="h-6 w-6" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p style={{ color: "#ef4444" }}>{error}</p>
                    </div>
                ) : companies.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-full"
                            style={{ background: "rgba(255, 255, 255, 0.05)" }}
                        >
                            <svg className="h-6 w-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p style={{ color: "#64748b" }}>No companies found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                                <tr>
                                    <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Company Name</th>
                                    <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>ORG Number</th>
                                    <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Records Grouped</th>
                                    <th className="px-5 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((company) => (
                                    <tr
                                        key={company.id}
                                        className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                                        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
                                    >
                                        <td className="px-5 py-4" style={{ color: "#e2e8f0" }}>
                                            <Link
                                                href={`/admin/customers/company/${encodeURIComponent(company.id)}`}
                                                className="font-medium hover:text-indigo-400 transition-colors"
                                            >
                                                {company.companyName}
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4" style={{ color: "#cbd5e1" }}>
                                            {company.orgNumber || "—"}
                                        </td>
                                        <td className="px-5 py-4" style={{ color: "#cbd5e1" }}>
                                            {company.sourceCount}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                href={`/admin/customers/company/${encodeURIComponent(company.id)}`}
                                                className="text-xs text-slate-500 group-hover:text-indigo-400 transition-colors"
                                            >
                                                View details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
