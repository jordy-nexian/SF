"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface WizardRun {
    id: string;
    wipNumber: string;
    wipContext: Record<string, unknown> | null;
    state: string;
    template: { id: string; name: string } | null;
    endCustomer: { id: string; email: string; name: string | null } | null;
    createdBy: { id: string; email: string };
    inviteSent: boolean;
    createdAt: string;
    completedAt: string | null;
}

const cardStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
};

const stateColors: Record<string, { bg: string; text: string; label: string }> = {
    wip_lookup: { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", label: "WIP Lookup" },
    template_selected: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", label: "Template Selected" },
    prefilled: { bg: "rgba(234, 179, 8, 0.15)", text: "#eab308", label: "Prefilled" },
    assigned: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", label: "Assigned" },
    cancelled: { bg: "rgba(107, 114, 128, 0.15)", text: "#6b7280", label: "Cancelled" },
    error: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", label: "Error" },
};

export default function WizardListPage() {
    const [wizardRuns, setWizardRuns] = useState<WizardRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [stateFilter, setStateFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), limit: "25" });
        if (stateFilter) params.set("state", stateFilter);

        fetch(`/api/admin/wizard?${params}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.data) {
                    setWizardRuns(data.data.wizardRuns || []);
                    setTotalPages(data.data.pagination?.totalPages || 1);
                }
            })
            .finally(() => setLoading(false));
    }, [page, stateFilter]);

    return (
        <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">WIP Wizards</h1>
                    <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
                        Track and manage template assignment wizards
                    </p>
                </div>
                <Link
                    href="/admin/wizard/new"
                    className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all"
                    style={{
                        background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                    }}
                >
                    + New Wizard
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-4 flex gap-2 flex-wrap">
                {[
                    { value: "", label: "All" },
                    ...Object.entries(stateColors).map(([value, { label }]) => ({
                        value,
                        label,
                    })),
                ].map((f) => (
                    <button
                        key={f.value}
                        onClick={() => {
                            setStateFilter(f.value);
                            setPage(1);
                        }}
                        className="rounded-full px-3 py-1.5 text-xs transition-all"
                        style={{
                            background:
                                stateFilter === f.value
                                    ? "rgba(99, 102, 241, 0.2)"
                                    : "transparent",
                            border:
                                stateFilter === f.value
                                    ? "1px solid rgba(99, 102, 241, 0.5)"
                                    : "1px solid #334155",
                            color:
                                stateFilter === f.value ? "#818cf8" : "#94a3b8",
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex items-center justify-center h-32" style={{ color: "#94a3b8" }}>
                    Loading…
                </div>
            ) : wizardRuns.length === 0 ? (
                <div className="rounded-xl p-8 text-center" style={cardStyle}>
                    <p className="mb-2 text-white">No wizard runs found</p>
                    <p className="text-sm" style={{ color: "#94a3b8" }}>
                        <Link href="/admin/wizard/new" style={{ color: "#818cf8" }}>
                            Start a new wizard →
                        </Link>
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {wizardRuns.map((wr) => {
                        const stateStyle =
                            stateColors[wr.state] || stateColors.error;
                        return (
                            <Link
                                key={wr.id}
                                href={
                                    wr.state !== "assigned" && wr.state !== "cancelled"
                                        ? `/admin/wizard/new?resume=${wr.id}`
                                        : "#"
                                }
                                className="block rounded-lg p-4 transition-all hover:brightness-110"
                                style={cardStyle}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm text-white">
                                            {wr.wipNumber}
                                        </span>
                                        <span
                                            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                                            style={{
                                                background: stateStyle.bg,
                                                color: stateStyle.text,
                                            }}
                                        >
                                            {stateStyle.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
                                        {wr.template && <span>{wr.template.name}</span>}
                                        {wr.endCustomer && (
                                            <span>{wr.endCustomer.email}</span>
                                        )}
                                        <span>
                                            {new Date(wr.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                {/* Context snippet */}
                                {wr.wipContext && (
                                    <div className="mt-2 flex gap-3 text-xs" style={{ color: "#94a3b8" }}>
                                        {(wr.wipContext as Record<string, string>).clientName && (
                                            <span>{(wr.wipContext as Record<string, string>).clientName}</span>
                                        )}
                                        {(wr.wipContext as Record<string, string>).projectName && (
                                            <span>· {(wr.wipContext as Record<string, string>).projectName}</span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="rounded-lg px-3 py-1.5 text-sm disabled:opacity-30"
                        style={{ border: "1px solid #334155", color: "#94a3b8" }}
                    >
                        Previous
                    </button>
                    <span className="text-sm" style={{ color: "#94a3b8" }}>
                        {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-lg px-3 py-1.5 text-sm disabled:opacity-30"
                        style={{ border: "1px solid #334155", color: "#94a3b8" }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
