"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface CompanyRow {
    id: string;
    companyName: string;
    orgNumber: string | null;
    sourceCount: number;
}

interface StatsSummary {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
}

export default function AdminHomePage() {
    const [companies, setCompanies] = useState<CompanyRow[]>([]);
    const [stats, setStats] = useState<StatsSummary>({ total: 0, pending: 0, inProgress: 0, completed: 0 });
    const [statsLoading, setStatsLoading] = useState(true);
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

        async function fetchStats() {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data?.data || data);
                }
            } catch {
                // silent — just leave stats at zero
            } finally {
                setStatsLoading(false);
            }
        }

        fetchCustomers();
        fetchStats();
    }, []);

    const completionPct = useMemo(() => {
        if (stats.total === 0) return 0;
        return Math.round((stats.completed / stats.total) * 100);
    }, [stats]);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            {/* Header + primary CTA */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Companies</h1>
                    <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
                        Companies with forms sent out.
                    </p>
                </div>
                <Link
                    href="/admin/wizard/new"
                    className="rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                    }}
                >
                    + New Form
                </Link>
            </div>

            {/* Stats widget */}
            <div
                className="rounded-2xl p-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <div className="flex flex-wrap items-center gap-6 justify-between">
                    <div className="flex items-center gap-5">
                        <StatusDonut
                            completed={stats.completed}
                            inProgress={stats.inProgress}
                            notStarted={stats.pending}
                            size={76}
                        />
                        <div>
                            <div className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>Overall progress</div>
                            <div className="text-2xl font-bold text-white">{completionPct}%</div>
                            <div className="text-xs" style={{ color: '#64748b' }}>
                                {statsLoading ? 'Loading…' : `${stats.total} forms sent`}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 flex-1 min-w-[360px]">
                        <StatPill label="Sent" value={stats.total} color="#818cf8" />
                        <StatPill label="In Progress" value={stats.inProgress} color="#fbbf24" />
                        <StatPill label="Completed" value={stats.completed} color="#4ade80" />
                    </div>
                </div>
            </div>

            {/* Companies table */}
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

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div>
            <div className="text-xs uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
        </div>
    );
}

function StatusDonut({ completed, inProgress, notStarted, size = 80 }: { completed: number; inProgress: number; notStarted: number; size?: number }) {
    const total = completed + inProgress + notStarted;
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const completedPct = total ? completed / total : 0;
    const inProgressPct = total ? inProgress / total : 0;

    const cOffset = 0;
    const ipOffset = circumference * completedPct;
    const nsOffset = circumference * (completedPct + inProgressPct);

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
            {total > 0 && (
                <>
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke="#4ade80" strokeWidth="10" fill="none"
                        strokeDasharray={`${circumference * completedPct} ${circumference}`}
                        strokeDashoffset={-cOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke="#fbbf24" strokeWidth="10" fill="none"
                        strokeDasharray={`${circumference * inProgressPct} ${circumference}`}
                        strokeDashoffset={-ipOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke="#94a3b8" strokeWidth="10" fill="none"
                        strokeDasharray={`${circumference * (1 - completedPct - inProgressPct)} ${circumference}`}
                        strokeDashoffset={-nsOffset}
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </>
            )}
        </svg>
    );
}
