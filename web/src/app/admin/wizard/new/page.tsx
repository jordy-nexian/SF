"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// --- Types ---
interface WipContext {
    clientName?: string;
    projectName?: string;
    clientEmail?: string;
    metadata?: Record<string, unknown>;
}

interface TemplateOption {
    id: string;
    name: string;
    _count: { mappings: number; forms: number };
}

interface Token {
    tokenId: string;
    label: string;
    key: string;
    mode: string;
}

interface PrefillEntry {
    key: string;
    label: string;
    value: string;
}

// --- Styles ---
const cardStyle = {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
};

const inputStyle = {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "white",
};

const stages = [
    { num: 1, label: "WIP Lookup" },
    { num: 2, label: "Select Template" },
    { num: 3, label: "Prefill & Preview" },
    { num: 4, label: "Assign User" },
];

export default function NewWizardPage() {
    const [stage, setStage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stage 1
    const [wipNumber, setWipNumber] = useState("");
    const [wizardRunId, setWizardRunId] = useState<string | null>(null);
    const [wipContext, setWipContext] = useState<WipContext | null>(null);

    // Stage 2
    const [templates, setTemplates] = useState<TemplateOption[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [tokens, setTokens] = useState<Token[]>([]);
    const [pinnedVersionId, setPinnedVersionId] = useState<string | null>(null);

    // Stage 3
    const [prefillData, setPrefillData] = useState<Record<string, PrefillEntry>>({});
    const [unmappedTokens, setUnmappedTokens] = useState<Array<{ tokenId: string; label: string; mode: string }>>([]);
    const [htmlPreview, setHtmlPreview] = useState<string>("");

    // Stage 4
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [sendInvite, setSendInvite] = useState(true);
    const [assignmentResult, setAssignmentResult] = useState<Record<string, unknown> | null>(null);

    // --- Stage 1: WIP Lookup ---
    async function handleWipLookup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/admin/wizard/wip-lookup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wipNumber: wipNumber.trim() }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || data.error || "WIP lookup failed");
            }

            setWizardRunId(data.data.wizardRunId);
            setWipContext(data.data.wipContext);

            // Prefill email from WIP context if available
            if (data.data.wipContext?.clientEmail) {
                setCustomerEmail(data.data.wipContext.clientEmail);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to look up WIP");
        } finally {
            setLoading(false);
        }
    }

    // --- Stage 2: Load Templates ---
    const loadTemplates = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/templates");
            const data = await res.json();
            if (res.ok) {
                setTemplates(data.data?.templates || []);
            }
        } catch {
            console.error("Failed to load templates");
        }
    }, []);

    useEffect(() => {
        if (stage === 2) {
            loadTemplates();
        }
    }, [stage, loadTemplates]);

    async function handleTemplateSelect() {
        if (!selectedTemplateId || !wizardRunId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/wizard/${wizardRunId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: selectedTemplateId,
                    stage: "template_selected",
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || "Template selection failed");
            }

            setTokens(data.data.tokens || []);
            setPinnedVersionId(data.data.pinnedVersionId);
            setStage(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to select template");
        } finally {
            setLoading(false);
        }
    }

    // --- Stage 3: Prefill ---
    async function handlePrefill() {
        if (!wizardRunId) return;
        setLoading(true);
        setError(null);

        try {
            // Collect any manual overrides the admin has entered
            const overrides: Record<string, string> = {};
            for (const [tokenId, entry] of Object.entries(prefillData)) {
                if (entry.value) overrides[tokenId] = entry.value;
            }

            const res = await fetch(`/api/admin/wizard/${wizardRunId}/prefill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ overrides: Object.keys(overrides).length > 0 ? overrides : undefined }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || "Prefill failed");
            }

            setPrefillData(data.data.prefillData || {});
            setUnmappedTokens(data.data.unmappedTokens || []);
            setHtmlPreview(data.data.htmlPreview || "");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to prefill form");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (stage === 3 && wizardRunId && Object.keys(prefillData).length === 0) {
            handlePrefill();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    // --- Stage 4: Assign ---
    async function handleAssign(e: React.FormEvent) {
        e.preventDefault();
        if (!wizardRunId) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/admin/wizard/${wizardRunId}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    endCustomerEmail: customerEmail.trim(),
                    endCustomerName: customerName.trim() || undefined,
                    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
                    sendInvite,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || "Assignment failed");
            }

            setAssignmentResult(data.data);
            setStage(5); // success
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to assign form");
        } finally {
            setLoading(false);
        }
    }

    // --- Render ---
    return (
        <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">WIP Wizard</h1>
                    <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
                        Assign a form to a customer using WIP data from Quickbase
                    </p>
                </div>
                <Link
                    href="/admin/wizard"
                    className="rounded-lg px-3 py-2 text-sm transition-colors"
                    style={{ border: "1px solid #334155", color: "#94a3b8" }}
                >
                    ← All Wizards
                </Link>
            </div>

            {/* Progress Steps */}
            <div className="mb-8 flex items-center gap-2">
                {stages.map((s) => (
                    <div key={s.num} className="flex items-center gap-2">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all"
                            style={{
                                background:
                                    stage > s.num
                                        ? "#10b981"
                                        : stage === s.num
                                            ? "linear-gradient(to right, #6366f1, #8b5cf6)"
                                            : "#334155",
                                color: stage >= s.num ? "white" : "#64748b",
                            }}
                        >
                            {stage > s.num ? "✓" : s.num}
                        </div>
                        <span
                            className="hidden text-xs sm:inline"
                            style={{
                                color: stage >= s.num ? "#e2e8f0" : "#64748b",
                            }}
                        >
                            {s.label}
                        </span>
                        {s.num < 4 && (
                            <div
                                className="hidden h-px w-8 sm:block"
                                style={{
                                    background: stage > s.num ? "#10b981" : "#334155",
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div
                    className="mb-4 rounded-lg p-3 text-sm"
                    style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#f87171",
                    }}
                >
                    {error}
                </div>
            )}

            {/* Stage 1: WIP Lookup */}
            {stage === 1 && !wipContext && (
                <div className="rounded-xl p-6" style={cardStyle}>
                    <h2 className="mb-4 text-lg font-semibold text-white">
                        Stage 1 — Enter WIP Number
                    </h2>
                    <form onSubmit={handleWipLookup} className="space-y-4">
                        <div>
                            <label
                                className="mb-1.5 block text-sm font-medium"
                                style={{ color: "#94a3b8" }}
                            >
                                WIP Number
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-lg px-3 py-2.5 font-mono focus:outline-none"
                                style={inputStyle}
                                value={wipNumber}
                                onChange={(e) => setWipNumber(e.target.value)}
                                placeholder="WIP-2026-0042"
                                disabled={loading}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !wipNumber.trim()}
                            className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
                            style={{
                                background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                            }}
                        >
                            {loading ? "Looking up…" : "Look Up WIP"}
                        </button>
                    </form>
                </div>
            )}

            {/* Stage 1: WIP Context Display */}
            {stage === 1 && wipContext && (
                <div className="rounded-xl p-6" style={cardStyle}>
                    <h2 className="mb-4 text-lg font-semibold text-white">
                        Stage 1 — WIP Found
                    </h2>
                    <div
                        className="mb-4 rounded-lg p-4 space-y-2"
                        style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                    >
                        <div className="flex justify-between">
                            <span style={{ color: "#94a3b8" }}>WIP Number</span>
                            <span className="font-mono text-white">{wipNumber}</span>
                        </div>
                        {wipContext.clientName && (
                            <div className="flex justify-between">
                                <span style={{ color: "#94a3b8" }}>Client</span>
                                <span className="text-white">{wipContext.clientName}</span>
                            </div>
                        )}
                        {wipContext.projectName && (
                            <div className="flex justify-between">
                                <span style={{ color: "#94a3b8" }}>Project</span>
                                <span className="text-white">{wipContext.projectName}</span>
                            </div>
                        )}
                        {wipContext.clientEmail && (
                            <div className="flex justify-between">
                                <span style={{ color: "#94a3b8" }}>Email</span>
                                <span className="text-white">{wipContext.clientEmail}</span>
                            </div>
                        )}
                        {wipContext.metadata &&
                            Object.entries(wipContext.metadata).map(([key, val]) => (
                                <div key={key} className="flex justify-between">
                                    <span style={{ color: "#94a3b8" }}>{key}</span>
                                    <span className="text-white">{String(val)}</span>
                                </div>
                            ))}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setStage(2)}
                            className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all"
                            style={{
                                background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                            }}
                        >
                            Continue to Form Selection →
                        </button>
                        <button
                            onClick={() => {
                                setWipContext(null);
                                setWipNumber("");
                            }}
                            className="rounded-full px-5 py-2.5 text-sm transition-colors"
                            style={{ border: "1px solid #334155", color: "#94a3b8" }}
                        >
                            Try Different WIP
                        </button>
                    </div>
                </div>
            )}

            {/* Stage 2: Template Selection */}
            {stage === 2 && (
                <div className="rounded-xl p-6" style={cardStyle}>
                    <h2 className="mb-4 text-lg font-semibold text-white">
                        Stage 2 — Select Form Template
                    </h2>
                    {templates.length === 0 ? (
                        <p style={{ color: "#94a3b8" }}>
                            No templates found.{" "}
                            <Link href="/admin/templates" style={{ color: "#818cf8" }}>
                                Create one first →
                            </Link>
                        </p>
                    ) : (
                        <>
                            <div className="mb-4 space-y-2">
                                {templates.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTemplateId(t.id)}
                                        className="w-full rounded-lg p-4 text-left transition-all"
                                        style={{
                                            background:
                                                selectedTemplateId === t.id
                                                    ? "rgba(99, 102, 241, 0.15)"
                                                    : "rgba(255, 255, 255, 0.03)",
                                            border:
                                                selectedTemplateId === t.id
                                                    ? "1px solid rgba(99, 102, 241, 0.5)"
                                                    : "1px solid rgba(255, 255, 255, 0.08)",
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-white">
                                                {t.name}
                                            </span>
                                            <span className="text-xs" style={{ color: "#64748b" }}>
                                                {t._count.mappings} tokens · {t._count.forms} forms
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleTemplateSelect}
                                    disabled={!selectedTemplateId || loading}
                                    className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
                                    style={{
                                        background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                                        boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
                                    }}
                                >
                                    {loading ? "Selecting…" : "Continue to Prefill →"}
                                </button>
                                <button
                                    onClick={() => setStage(1)}
                                    className="rounded-full px-5 py-2.5 text-sm transition-colors"
                                    style={{ border: "1px solid #334155", color: "#94a3b8" }}
                                >
                                    ← Back
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Stage 3: Prefill & Preview */}
            {stage === 3 && (
                <div className="space-y-6">
                    {/* Prefill Data Editor */}
                    <div className="rounded-xl p-6" style={cardStyle}>
                        <h2 className="mb-4 text-lg font-semibold text-white">
                            Stage 3 — Prefill & Preview
                        </h2>

                        {loading ? (
                            <p style={{ color: "#94a3b8" }}>
                                Fetching data from Quickbase via n8n…
                            </p>
                        ) : (
                            <>
                                {/* Editable prefill fields */}
                                <div className="mb-4 space-y-3">
                                    {Object.entries(prefillData).map(([tokenId, entry]) => (
                                        <div key={tokenId}>
                                            <label
                                                className="mb-1 block text-xs font-medium"
                                                style={{ color: "#94a3b8" }}
                                            >
                                                {entry.label}{" "}
                                                <span className="font-mono text-xs" style={{ color: "#64748b" }}>
                                                    ({entry.key})
                                                </span>
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                                                style={inputStyle}
                                                value={entry.value}
                                                onChange={(e) =>
                                                    setPrefillData((prev) => ({
                                                        ...prev,
                                                        [tokenId]: {
                                                            ...prev[tokenId],
                                                            value: e.target.value,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Unmapped tokens warning */}
                                {unmappedTokens.length > 0 && (
                                    <div
                                        className="mb-4 rounded-lg p-3"
                                        style={{
                                            background: "rgba(234, 179, 8, 0.1)",
                                            border: "1px solid rgba(234, 179, 8, 0.3)",
                                        }}
                                    >
                                        <p
                                            className="text-sm font-medium mb-1"
                                            style={{ color: "#eab308" }}
                                        >
                                            ⚠ Non-prefill tokens (will be filled by end user):
                                        </p>
                                        <ul className="text-xs space-y-0.5" style={{ color: "#94a3b8" }}>
                                            {unmappedTokens.map((t) => (
                                                <li key={t.tokenId}>
                                                    {t.label} ({t.mode})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            // Re-run prefill with overrides
                                            handlePrefill().then(() => setStage(4));
                                        }}
                                        disabled={loading}
                                        className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
                                        style={{
                                            background:
                                                "linear-gradient(to right, #6366f1, #8b5cf6)",
                                            boxShadow:
                                                "0 4px 15px rgba(99, 102, 241, 0.3)",
                                        }}
                                    >
                                        {loading ? "Saving…" : "Continue to Assignment →"}
                                    </button>
                                    <button
                                        onClick={handlePrefill}
                                        disabled={loading}
                                        className="rounded-full px-5 py-2.5 text-sm transition-colors"
                                        style={{ border: "1px solid #334155", color: "#94a3b8" }}
                                    >
                                        ↻ Re-fetch from Quickbase
                                    </button>
                                    <button
                                        onClick={() => setStage(2)}
                                        className="rounded-full px-5 py-2.5 text-sm transition-colors"
                                        style={{ border: "1px solid #334155", color: "#94a3b8" }}
                                    >
                                        ← Back
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* HTML Preview */}
                    {htmlPreview && (
                        <div className="rounded-xl p-6" style={cardStyle}>
                            <h3 className="mb-3 text-sm font-semibold text-white">
                                Preview
                            </h3>
                            <div
                                className="rounded-lg bg-white p-4 text-sm text-black"
                                dangerouslySetInnerHTML={{ __html: htmlPreview }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Stage 4: Assign User */}
            {stage === 4 && (
                <div className="rounded-xl p-6" style={cardStyle}>
                    <h2 className="mb-4 text-lg font-semibold text-white">
                        Stage 4 — Assign to End User
                    </h2>
                    <form onSubmit={handleAssign} className="space-y-4">
                        <div>
                            <label
                                className="mb-1.5 block text-sm font-medium"
                                style={{ color: "#94a3b8" }}
                            >
                                Customer Email *
                            </label>
                            <input
                                type="email"
                                className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
                                style={inputStyle}
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                placeholder="customer@example.com"
                                required
                            />
                            <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                                If the customer doesn&apos;t exist, they&apos;ll be created and invited.
                            </p>
                        </div>

                        <div>
                            <label
                                className="mb-1.5 block text-sm font-medium"
                                style={{ color: "#94a3b8" }}
                            >
                                Customer Name
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
                                style={inputStyle}
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Sarah Chen"
                            />
                        </div>

                        <div>
                            <label
                                className="mb-1.5 block text-sm font-medium"
                                style={{ color: "#94a3b8" }}
                            >
                                Due Date
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
                                style={inputStyle}
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="sendInvite"
                                checked={sendInvite}
                                onChange={(e) => setSendInvite(e.target.checked)}
                                className="rounded"
                            />
                            <label
                                htmlFor="sendInvite"
                                className="text-sm"
                                style={{ color: "#94a3b8" }}
                            >
                                Send magic link invite email
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={loading || !customerEmail.trim()}
                                className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
                                style={{
                                    background:
                                        "linear-gradient(to right, #10b981, #059669)",
                                    boxShadow:
                                        "0 4px 15px rgba(16, 185, 129, 0.3)",
                                }}
                            >
                                {loading ? "Assigning…" : "Assign & Send Invite"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStage(3)}
                                className="rounded-full px-5 py-2.5 text-sm transition-colors"
                                style={{ border: "1px solid #334155", color: "#94a3b8" }}
                            >
                                ← Back
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stage 5: Success */}
            {stage === 5 && assignmentResult && (
                <div className="rounded-xl p-6" style={cardStyle}>
                    <div className="text-center">
                        <div
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-2xl"
                            style={{ background: "rgba(16, 185, 129, 0.15)" }}
                        >
                            ✓
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-white">
                            Form Assigned Successfully
                        </h2>
                        <p className="mb-6 text-sm" style={{ color: "#94a3b8" }}>
                            WIP {wipNumber} → {(assignmentResult as Record<string, unknown>)?.assignment
                                ? `assigned to ${((assignmentResult as Record<string, unknown>).assignment as Record<string, unknown>)?.endCustomer
                                    ? ((((assignmentResult as Record<string, unknown>).assignment as Record<string, unknown>).endCustomer as Record<string, unknown>)?.email as string) || ''
                                    : ''}`
                                : 'completed'}
                        </p>
                        <div className="flex justify-center gap-3">
                            <Link
                                href="/admin/wizard/new"
                                onClick={(e) => {
                                    e.preventDefault();
                                    // Reset all state for a new wizard
                                    setStage(1);
                                    setWipNumber("");
                                    setWipContext(null);
                                    setWizardRunId(null);
                                    setSelectedTemplateId(null);
                                    setTemplates([]);
                                    setTokens([]);
                                    setPrefillData({});
                                    setUnmappedTokens([]);
                                    setHtmlPreview("");
                                    setCustomerEmail("");
                                    setCustomerName("");
                                    setDueDate("");
                                    setAssignmentResult(null);
                                    setError(null);
                                }}
                                className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all"
                                style={{
                                    background:
                                        "linear-gradient(to right, #6366f1, #8b5cf6)",
                                    boxShadow:
                                        "0 4px 15px rgba(99, 102, 241, 0.3)",
                                }}
                            >
                                Start New Wizard
                            </Link>
                            <Link
                                href="/admin/wizard"
                                className="rounded-full px-5 py-2.5 text-sm transition-colors"
                                style={{ border: "1px solid #334155", color: "#94a3b8" }}
                            >
                                View All Wizards
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
