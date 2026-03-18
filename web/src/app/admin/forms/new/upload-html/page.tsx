"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Monaco editor
const HtmlTemplateEditor = dynamic(() => import("@/components/HtmlTemplateEditor"), {
    ssr: false,
    loading: () => (
        <div className="rounded-xl p-6 flex items-center justify-center" style={{ height: '400px', background: 'rgba(255, 255, 255, 0.05)' }}>
            <span style={{ color: '#94a3b8' }}>Loading editor...</span>
        </div>
    ),
});

interface ExtractedToken {
    tokenId: string;
    label: string;
    position: number;
}

interface TokenMapping {
    tokenId: string;
    label: string;
    payloadKey: string;
    mode: "prefill" | "manual" | "signature";
    required?: boolean;
}

const cardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
    background: '#1e293b',
    border: '1px solid #334155',
    color: 'white',
};

export default function UploadHtmlTemplatePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState("");
    const [publicId, setPublicId] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [tokens, setTokens] = useState<ExtractedToken[]>([]);
    const [mappings, setMappings] = useState<TokenMapping[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"upload" | "mapping">("upload");

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
            setError("Please upload an HTML file (.html or .htm)");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            setHtmlContent(content);
            setFileName(file.name);
            setName(file.name.replace(/\.(html|htm)$/i, ''));
            setPublicId(file.name.replace(/\.(html|htm)$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));

            // Extract tokens client-side for preview
            const tokenRegex = /<span[^>]*class=["'][^"']*fe-token[^"']*["'][^>]*data-token-id=["']([^"']+)["'][^>]*>([^<]*)<\/span>/gi;
            const found: ExtractedToken[] = [];
            let match;
            while ((match = tokenRegex.exec(content)) !== null) {
                found.push({
                    tokenId: match[1],
                    label: match[2].trim(),
                    position: match.index,
                });
            }

            if (found.length === 0) {
                setError("No tokens found in the HTML file. The file must contain <span class=\"fe-token\" data-token-id=\"...\"> elements.");
                return;
            }

            setTokens(found);
            setMappings(found.map(t => ({
                tokenId: t.tokenId,
                label: t.label,
                payloadKey: t.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                mode: "prefill" as const,
                required: false,
            })));
            setError(null);
            setStep("mapping");
        };
        reader.onerror = () => {
            setError("Failed to read file");
        };
        reader.readAsText(file);
    }, []);

    const updateMapping = (tokenId: string, payloadKey: string) => {
        setMappings(prev =>
            prev.map(m => m.tokenId === tokenId ? { ...m, payloadKey } : m)
        );
    };

    const updateMappingMode = (tokenId: string, mode: "prefill" | "manual" | "signature") => {
        setMappings(prev =>
            prev.map(m => m.tokenId === tokenId ? { ...m, mode, required: mode === "manual" } : m)
        );
    };

    // Cycle through modes: prefill -> manual -> signature -> prefill
    const cycleMode = (currentMode: "prefill" | "manual" | "signature") => {
        if (currentMode === "prefill") return "manual";
        if (currentMode === "manual") return "signature";
        return "prefill";
    };

    // Get mode display info
    const getModeDisplay = (mode: "prefill" | "manual" | "signature") => {
        switch (mode) {
            case "prefill":
                return { icon: "🔄", label: "Prefill", bg: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", border: "rgba(99, 102, 241, 0.3)" };
            case "manual":
                return { icon: "✏️", label: "Manual", bg: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "rgba(34, 197, 94, 0.3)" };
            case "signature":
                return { icon: "✍️", label: "Signature", bg: "rgba(251, 146, 60, 0.2)", color: "#fb923c", border: "rgba(251, 146, 60, 0.3)" };
        }
    };

    // Helper function to infer field type from label
    const inferFieldType = (label: string): string => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('email')) return 'email';
        if (lowerLabel.includes('phone') || lowerLabel.includes('tel')) return 'text';
        if (lowerLabel.includes('date')) return 'date';
        if (lowerLabel.includes('amount') || lowerLabel.includes('turnover') ||
            lowerLabel.includes('employees') || lowerLabel.includes('jobs') ||
            lowerLabel.includes('number') && !lowerLabel.includes('company')) return 'number';
        if (lowerLabel.includes('address') || lowerLabel.includes('description') ||
            lowerLabel.includes('activity') || lowerLabel.includes('purpose')) return 'textarea';
        return 'text';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. Create the template
            const templateRes = await fetch("/api/admin/templates", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, htmlContent }),
            });
            const templateJson = await templateRes.json().catch(() => ({}));
            if (!templateRes.ok) {
                throw new Error(templateJson.error?.message || "Failed to create template");
            }
            const templateId = templateJson.data?.templateId;

            // 2. Save the mappings (include mode for each token)
            const validMappings = mappings.filter(m => m.payloadKey.trim());
            if (validMappings.length > 0) {
                const mappingsRes = await fetch(`/api/admin/templates/${templateId}/mappings`, {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        mappings: validMappings.map(m => ({
                            tokenId: m.tokenId,
                            payloadKey: m.payloadKey,
                            mode: m.mode,
                        })),
                    }),
                });
                if (!mappingsRes.ok) {
                    console.warn("Failed to save mappings, but template was created");
                }
            }

            // 3. Generate a form schema from the token mappings
            // Manual fields become actual form inputs; prefill fields are display-only
            const schema = {
                id: publicId,
                version: 1,
                title: name,
                description: `Form generated from HTML template: ${fileName}`,
                fields: validMappings.map(m => ({
                    key: m.payloadKey,
                    type: inferFieldType(m.label),
                    label: m.label,
                    required: m.mode === "manual" && m.required,
                    mode: m.mode, // prefill or manual
                })),
                steps: [],
            };

            // 4. Create the form linked to the template WITH the schema
            const formRes = await fetch("/api/admin/forms", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    name,
                    publicId,
                    templateId,
                    schema, // This will create a FormVersion
                    htmlContent,
                }),
            });
            const formJson = await formRes.json().catch(() => ({}));
            if (!formRes.ok) {
                throw new Error(formJson.error?.message || "Failed to create form");
            }

            const formId = formJson.data?.formId || formJson.data?.id;
            router.push(`/admin/forms/${formId}`);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Upload HTML Template</h1>
                <p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
                    Upload an HTML file containing fe-token placeholders.{" "}
                    <Link href="/admin/forms/builder" style={{ color: '#818cf8' }}>
                        Or use the visual builder →
                    </Link>
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {step === "upload" && (
                    <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-indigo-500"
                            style={{ borderColor: '#334155' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".html,.htm"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <div className="text-4xl mb-3">📄</div>
                            <p className="text-white font-medium">Click to upload HTML template</p>
                            <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                                or drag and drop (.html, .htm)
                            </p>
                        </div>
                    </div>
                )}

                {step === "mapping" && (
                    <div className="space-y-6">
                        {/* File info */}
                        <div className="rounded-xl p-4 flex items-center justify-between" style={cardStyle}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">✅</span>
                                <div>
                                    <p className="text-white font-medium">{fileName}</p>
                                    <p className="text-sm" style={{ color: '#64748b' }}>
                                        {tokens.length} tokens found
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setStep("upload"); setTokens([]); setHtmlContent(""); }}
                                className="text-sm px-3 py-1 rounded"
                                style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.05)' }}
                            >
                                Change file
                            </button>
                        </div>

                        {/* HTML Editor with Live Preview */}
                        <div className="h-[700px]">
                            <HtmlTemplateEditor
                                htmlContent={htmlContent}
                                onHtmlChange={setHtmlContent}
                                tokens={tokens}
                                onTokensChange={(newTokens) => {
                                    setTokens(newTokens);
                                    // Update mappings for new tokens
                                    setMappings(prev => {
                                        const existingMap = new Map(prev.map(m => [m.tokenId, m]));
                                        return newTokens.map(t =>
                                            existingMap.get(t.tokenId) || {
                                                tokenId: t.tokenId,
                                                label: t.label,
                                                payloadKey: t.label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
                                                mode: "prefill" as const,
                                                required: false,
                                            }
                                        );
                                    });
                                }}
                            />
                        </div>

                        {/* Form details */}
                        <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
                            <h2 className="text-lg font-semibold text-white">Template Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                                        Template Name
                                    </label>
                                    <input
                                        className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
                                        style={inputStyle}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                                        Public ID (slug)
                                    </label>
                                    <input
                                        className="w-full rounded-lg px-3 py-2.5 font-mono focus:outline-none"
                                        style={inputStyle}
                                        value={publicId}
                                        onChange={(e) => setPublicId(e.target.value)}
                                        placeholder="my-form"
                                        required
                                    />
                                    <p className="mt-1 text-xs" style={{ color: '#64748b' }}>
                                        URL: /f/{publicId || "..."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Token mappings */}
                        <div className="rounded-xl p-5" style={cardStyle}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Token Mappings</h2>
                                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                                        Drag to reorder. Map tokens to payload field names.
                                    </p>
                                </div>
                                <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}>
                                    {mappings.length} tokens
                                </span>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {mappings.map((mapping, index) => (
                                    <div
                                        key={mapping.tokenId}
                                        draggable
                                        onDragStart={(e) => {
                                            e.dataTransfer.setData('text/plain', index.toString());
                                            e.currentTarget.style.opacity = '0.5';
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderTop = '2px solid #818cf8';
                                        }}
                                        onDragLeave={(e) => {
                                            e.currentTarget.style.borderTop = 'none';
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.currentTarget.style.borderTop = 'none';
                                            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                            const toIndex = index;
                                            if (fromIndex !== toIndex) {
                                                setMappings(prev => {
                                                    const newMappings = [...prev];
                                                    const [moved] = newMappings.splice(fromIndex, 1);
                                                    newMappings.splice(toIndex, 0, moved);
                                                    return newMappings;
                                                });
                                            }
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all hover:bg-white/5"
                                        style={{ background: 'rgba(0,0,0,0.2)' }}
                                    >
                                        {/* Drag handle */}
                                        <div className="text-gray-500 select-none" style={{ cursor: 'grab' }}>
                                            ⠿
                                        </div>

                                        {/* Token info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate" title={mapping.label}>
                                                {mapping.label}
                                            </p>
                                            <p className="text-xs font-mono truncate" style={{ color: '#64748b' }} title={mapping.tokenId}>
                                                ID: {mapping.tokenId.substring(0, 12)}...
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <div style={{ color: '#64748b' }}>→</div>

                                        {/* Payload key input */}
                                        <input
                                            className="w-40 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            style={inputStyle}
                                            value={mapping.payloadKey}
                                            onChange={(e) => updateMapping(mapping.tokenId, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            placeholder="payload_key"
                                        />

                                        {/* Mode toggle */}
                                        {(() => {
                                            const display = getModeDisplay(mapping.mode);
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateMappingMode(mapping.tokenId, cycleMode(mapping.mode));
                                                    }}
                                                    className="px-3 py-2 rounded text-xs font-medium transition-all flex items-center gap-1.5"
                                                    style={{
                                                        background: display.bg,
                                                        color: display.color,
                                                        border: `1px solid ${display.border}`,
                                                    }}
                                                    title="Click to cycle: Prefill → Manual → Signature"
                                                >
                                                    {display.icon} {display.label}
                                                </button>
                                            );
                                        })()}

                                        {/* Order number */}
                                        <span className="text-xs w-6 text-center" style={{ color: '#64748b' }}>
                                            #{index + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.98] disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                                }}
                            >
                                {loading ? "Creating..." : "Create Template"}
                            </button>
                            <Link href="/admin" className="text-sm" style={{ color: '#94a3b8' }}>
                                Cancel
                            </Link>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
                    </div>
                )}
            </form>
        </div>
    );
}
