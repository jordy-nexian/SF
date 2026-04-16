"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CompanyInfo {
    id: string;
    companyName: string;
    orgNumber: string | null;
    sourceCount: number;
}

interface Assignment {
    customerId: string;
    customerName: string | null;
    customerEmail: string;
    assignmentId: string;
    formName: string;
    formPublicId: string;
    status: "pending" | "in_progress" | "completed";
    dueDate: string | null;
    completedAt: string | null;
}

const STATUS_CONFIG = {
    pending:     { label: "Not started", dot: "bg-slate-500" },
    in_progress: { label: "In progress", dot: "bg-amber-400" },
    completed:   { label: "Completed",   dot: "bg-green-400" },
};

export default function CompanyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [company, setCompany] = useState<CompanyInfo | null>(null);
    const [records, setRecords] = useState<Record<string, unknown>[]>([]);
    const [fieldKeys, setFieldKeys] = useState<string[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCompany() {
            try {
                const res = await fetch(`/api/admin/customers/company/${encodeURIComponent(id)}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Request failed (${res.status})`);
                }
                const data = await res.json();
                setCompany(data.company);
                setAssignments(Array.isArray(data.assignments) ? data.assignments : []);

                const rows: Record<string, unknown>[] = Array.isArray(data.records) ? data.records : [];
                setRecords(rows);

                // Discover all field keys dynamically, excluding structural envelope keys
                const excluded = new Set(["values", "data"]);
                const keys = new Set<string>();
                for (const record of rows) {
                    for (const key of Object.keys(record)) {
                        if (!excluded.has(key)) keys.add(key);
                    }
                }
                setFieldKeys(Array.from(keys));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load company");
            } finally {
                setLoading(false);
            }
        }

        fetchCompany();
    }, [id]);

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return "—";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value);
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/customers"
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    aria-label="Back to Companies"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>

                {loading ? (
                    <div className="h-8 w-48 animate-pulse rounded-md" style={{ background: "rgba(255,255,255,0.08)" }} />
                ) : company ? (
                    <div>
                        <h1 className="text-2xl font-bold text-white">{company.companyName}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            {company.orgNumber && (
                                <span
                                    className="text-xs font-mono px-2 py-0.5 rounded"
                                    style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
                                >
                                    ORG {company.orgNumber}
                                </span>
                            )}
                            <span className="text-sm" style={{ color: "#64748b" }}>
                                {company.sourceCount} record{company.sourceCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Loading / Error */}
            {loading ? (
                <div
                    className="flex items-center justify-center rounded-xl py-16"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <div className="flex items-center gap-3" style={{ color: "#94a3b8" }}>
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading company details...
                    </div>
                </div>
            ) : error ? (
                <div
                    className="flex flex-col items-center gap-3 rounded-xl py-16"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.1)" }}>
                        <svg className="h-6 w-6" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p style={{ color: "#ef4444" }}>{error}</p>
                </div>
            ) : (
                <>
                    {/* Forms Sent */}
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold text-white">Forms Sent</h2>

                        {assignments.length === 0 ? (
                            <div
                                className="rounded-xl px-6 py-10 text-center"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <p className="text-sm" style={{ color: "#64748b" }}>
                                    No forms have been sent to this company yet.
                                </p>
                            </div>
                        ) : (
                            <div
                                className="overflow-hidden rounded-xl"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                                <table className="min-w-full text-left text-sm">
                                    <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                                        <tr>
                                            <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Form</th>
                                            <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Recipient</th>
                                            <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Status</th>
                                            <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Due</th>
                                            <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Completed</th>
                                            <th className="px-5 py-3" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignments.map((a) => {
                                            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending;
                                            return (
                                                <tr key={a.assignmentId} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                    <td className="px-5 py-4 font-medium" style={{ color: "#e2e8f0" }}>
                                                        {a.formName}
                                                    </td>
                                                    <td className="px-5 py-4" style={{ color: "#cbd5e1" }}>
                                                        <div>{a.customerName || a.customerEmail}</div>
                                                        {a.customerName && (
                                                            <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{a.customerEmail}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="flex items-center gap-1.5">
                                                            <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
                                                            <span style={{ color: "#cbd5e1" }}>{cfg.label}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4" style={{ color: "#94a3b8" }}>
                                                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="px-5 py-4" style={{ color: "#94a3b8" }}>
                                                        {a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "—"}
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            href={`/f/${a.formPublicId}`}
                                                            target="_blank"
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                                        >
                                                            Open →
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Company Records from webhook */}
                    {records.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">Company Records</h2>
                            <div
                                className="overflow-hidden rounded-xl"
                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                                            <tr>
                                                {fieldKeys.map((key) => (
                                                    <th
                                                        key={key}
                                                        className="px-5 py-3 font-medium whitespace-nowrap"
                                                        style={{ color: "#94a3b8" }}
                                                    >
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((record, i) => (
                                                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                    {fieldKeys.map((key) => (
                                                        <td
                                                            key={key}
                                                            className="px-5 py-4 whitespace-nowrap"
                                                            style={{ color: "#cbd5e1" }}
                                                        >
                                                            {formatValue(record[key])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
