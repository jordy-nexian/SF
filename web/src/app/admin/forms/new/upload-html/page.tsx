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

            // 2. Save the mappings
            const validMappings = mappings.filter(m => m.payloadKey.trim());
            if (validMappings.length > 0) {
                const mappingsRes = await fetch(`/api/admin/templates/${templateId}/mappings`, {
                    method: "PUT",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        mappings: validMappings.map(m => ({
                            tokenId: m.tokenId,
                            payloadKey: m.payloadKey,
                        })),
                    }),
                });
                if (!mappingsRes.ok) {
                    console.warn("Failed to save mappings, but template was created");
                }
            }

            // 3. Generate a form schema from the token mappings
            const schema = {
                id: publicId,
                version: 1,
                title: name,
                description: `Form generated from HTML template: ${fileName}`,
                fields: validMappings.map(m => ({
                    key: m.payloadKey,
                    type: inferFieldType(m.label),
                    label: m.label,
                    required: false,
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
                                        }
                                    );
                                });
                            }}
                        />

                        {/* Form details */}
                        <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
                            <h2 className="text-lg font-semibold text-white">Form Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                                        Form Name
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
                            <h2 className="text-lg font-semibold text-white mb-4">Token Mappings</h2>
                            <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                                Map each token to a payload field name. When pre-populating the form, the system will look for these keys in the incoming data.
                            </p>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {mappings.map((mapping) => (
                                    <div
                                        key={mapping.tokenId}
                                        className="grid grid-cols-2 gap-4 items-center p-3 rounded-lg"
                                        style={{ background: 'rgba(0,0,0,0.2)' }}
                                    >
                                        <div>
                                            <p className="text-white text-sm font-medium truncate" title={mapping.label}>
                                                {mapping.label}
                                            </p>
                                            <p className="text-xs font-mono truncate" style={{ color: '#64748b' }} title={mapping.tokenId}>
                                                {mapping.tokenId.substring(0, 8)}...
                                            </p>
                                        </div>
                                        <input
                                            className="w-full rounded px-3 py-2 text-sm font-mono focus:outline-none"
                                            style={inputStyle}
                                            value={mapping.payloadKey}
                                            onChange={(e) => updateMapping(mapping.tokenId, e.target.value)}
                                            placeholder="payload_key"
                                        />
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
                                {loading ? "Creating..." : "Create Form from Template"}
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
