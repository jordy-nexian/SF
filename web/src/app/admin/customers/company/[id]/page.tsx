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

type FormRecord = Record<string, unknown>;

interface FormAssignment {
    FormName?: string;
    Email?: string;
    DateTime?: string;
    LookedAt?: number;
    PublicId?: string;
}

function getStatusConfig(lookedAt: number | undefined) {
    if (lookedAt === 2) return { label: "Completed", bg: "rgba(34,197,94,0.15)", color: "#4ade80", dot: "#22c55e" };
    if (lookedAt === 1) return { label: "Viewed",    bg: "rgba(251,191,36,0.15)", color: "#fbbf24", dot: "#f59e0b" };
    return                       { label: "Not Started", bg: "rgba(100,116,139,0.15)", color: "#94a3b8", dot: "#64748b" };
}

function formatDateTime(value: string | undefined): string {
    if (!value) return "—";
    try {
        return new Intl.DateTimeFormat("en-GB", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
}

const EXCLUDED_KEYS = new Set(["values", "data"]);

function discoverKeys(rows: FormRecord[]): string[] {
    const keys = new Set<string>();
    for (const row of rows) {
        for (const k of Object.keys(row)) {
            if (!EXCLUDED_KEYS.has(k)) keys.add(k);
        }
    }
    return Array.from(keys);
}

export default function CompanyDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [company, setCompany] = useState<CompanyInfo | null>(null);
    const [records, setRecords] = useState<FormRecord[]>([]);
    const [fieldKeys, setFieldKeys] = useState<string[]>([]);
    const [assignments, setAssignments] = useState<FormAssignment[]>([]);
    const [viewingForm, setViewingForm] = useState<FormAssignment | null>(null);
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

                const rows: FormRecord[] = Array.isArray(data.records) ? data.records : [];
                setRecords(rows);
                setFieldKeys(discoverKeys(rows));

                setAssignments(Array.isArray(data.assignments) ? data.assignments as FormAssignment[] : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load company");
            } finally {
                setLoading(false);
            }
        }

        fetchCompany();
    }, [id]);

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
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                                            <tr>
                                                <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Form Name</th>
                                                <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Email</th>
                                                <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Sent</th>
                                                <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>Status</th>
                                                <th className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}><span className="sr-only">Actions</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map((a, i) => {
                                                const status = getStatusConfig(a.LookedAt);
                                                return (
                                                    <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                        <td className="px-5 py-4 whitespace-nowrap font-medium" style={{ color: "#e2e8f0" }}>
                                                            {a.FormName ?? "—"}
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "#94a3b8" }}>
                                                            {a.Email ?? "—"}
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap" style={{ color: "#94a3b8" }}>
                                                            {formatDateTime(a.DateTime)}
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap">
                                                            <span
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                style={{ background: status.bg, color: status.color }}
                                                            >
                                                                <span
                                                                    className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0"
                                                                    style={{ background: status.dot }}
                                                                />
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 whitespace-nowrap text-right">
                                                            {a.PublicId ? (
                                                                <button
                                                                    onClick={() => setViewingForm(a)}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                                                    style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.25)"; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                    </svg>
                                                                    View
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs" style={{ color: "#475569" }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
                                                    <th key={key} className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {records.map((record, i) => (
                                                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                    {fieldKeys.map((key) => (
                                                        <td key={key} className="px-5 py-4 whitespace-nowrap" style={{ color: "#cbd5e1" }}>
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

            {/* Form viewer slide-over */}
            {viewingForm?.PublicId && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                        onClick={() => setViewingForm(null)}
                    />

                    {/* Panel */}
                    <div
                        className="relative flex flex-col w-full max-w-3xl h-full shadow-2xl"
                        style={{ background: "#0f172a", borderLeft: "1px solid rgba(255,255,255,0.1)" }}
                    >
                        {/* Panel header */}
                        <div
                            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                        >
                            <div className="min-w-0">
                                <h3 className="text-base font-semibold text-white truncate">
                                    {viewingForm.FormName ?? "Form"}
                                </h3>
                                <p className="text-xs mt-0.5 truncate" style={{ color: "#64748b" }}>
                                    {viewingForm.Email ?? ""}
                                    {viewingForm.Email && viewingForm.DateTime ? " · " : ""}
                                    {formatDateTime(viewingForm.DateTime)}
                                </p>
                            </div>

                            <button
                                onClick={() => setViewingForm(null)}
                                className="ml-4 flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-white/10"
                                style={{ color: "#94a3b8" }}
                                aria-label="Close panel"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Form iframe */}
                        <div className="relative flex-1 min-h-0">
                            <iframe
                                src={`/f/${viewingForm.PublicId}`}
                                className="absolute inset-0 w-full h-full border-0"
                                style={{ background: "#f8fafc" }}
                                title={`Form: ${viewingForm.FormName ?? "Preview"}`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
