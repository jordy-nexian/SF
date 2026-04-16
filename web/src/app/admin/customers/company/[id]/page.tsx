"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CompanyInfo {
    id: string;
    companyName: string;
    orgNumber: string | null;
    sourceCount: number;
}

type FormRecord = Record<string, unknown>;

function getStatusDot(value: unknown): string {
    const s = String(value ?? "").toLowerCase().replace(/\s+/g, "_");
    if (s === "completed") return "bg-green-400";
    if (s === "in_progress") return "bg-amber-400";
    return "bg-slate-500";
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
    const [assignments, setAssignments] = useState<FormRecord[]>([]);
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

                setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load company");
            } finally {
                setLoading(false);
            }
        }

        fetchCompany();
    }, [id]);

    const formKeys = useMemo(() => discoverKeys(assignments), [assignments]);

    const statusKey = useMemo(
        () => formKeys.find((k) => /^status$/i.test(k) || /^formstatus$/i.test(k) || /^state$/i.test(k)),
        [formKeys]
    );

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
                                                {formKeys.map((k) => (
                                                    <th key={k} className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#94a3b8" }}>
                                                        {k}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map((a, i) => (
                                                <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                                    {formKeys.map((k) => (
                                                        <td key={k} className="px-5 py-4 whitespace-nowrap" style={{ color: "#cbd5e1" }}>
                                                            {k === statusKey ? (
                                                                <span className="flex items-center gap-1.5">
                                                                    <span className={`inline-block h-2 w-2 rounded-full ${getStatusDot(a[k])}`} />
                                                                    {formatValue(a[k])}
                                                                </span>
                                                            ) : formatValue(a[k])}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
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
        </div>
    );
}
