"use client";

import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";

interface ExtractedToken {
    tokenId: string;
    label: string;
    position: number;
}

interface HtmlTemplateEditorProps {
    htmlContent: string;
    onHtmlChange: (html: string) => void;
    tokens: ExtractedToken[];
    onTokensChange: (tokens: ExtractedToken[]) => void;
}

const cardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};

/**
 * Extract fe-token spans from HTML
 */
function extractTokens(html: string): ExtractedToken[] {
    const tokens: ExtractedToken[] = [];
    const tokenRegex = /<span[^>]*class=["'][^"']*fe-token[^"']*["'][^>]*data-token-id=["']([^"']+)["'][^>]*>([^<]*)<\/span>/gi;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(html)) !== null) {
        tokens.push({
            tokenId: match[1],
            label: match[2].trim(),
            position: match.index,
        });
    }

    // Also check for tokens where data-token-id comes before class
    const altRegex = /<span[^>]*data-token-id=["']([^"']+)["'][^>]*class=["'][^"']*fe-token[^"']*["'][^>]*>([^<]*)<\/span>/gi;

    let altMatch: RegExpExecArray | null;
    while ((altMatch = altRegex.exec(html)) !== null) {
        if (!tokens.some(t => t.tokenId === altMatch![1])) {
            tokens.push({
                tokenId: altMatch[1],
                label: altMatch[2].trim(),
                position: altMatch.index,
            });
        }
    }

    tokens.sort((a, b) => a.position - b.position);
    return tokens;
}

/**
 * Highlight tokens in HTML for preview
 */
function highlightTokens(html: string): string {
    // Replace fe-token spans with highlighted versions
    return html.replace(
        /<span([^>]*class=["'][^"']*fe-token[^"']*["'][^>]*)>([^<]*)<\/span>/gi,
        '<span$1 style="background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%); color: white; padding: 2px 8px; border-radius: 4px; font-weight: 500;">$2</span>'
    );
}

export default function HtmlTemplateEditor({
    htmlContent,
    onHtmlChange,
    tokens,
    onTokensChange,
}: HtmlTemplateEditorProps) {
    const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
    const [editorMounted, setEditorMounted] = useState(false);

    // Re-extract tokens when HTML changes
    const handleEditorChange = useCallback((value: string | undefined) => {
        const newHtml = value || "";
        onHtmlChange(newHtml);

        // Extract and update tokens
        const newTokens = extractTokens(newHtml);
        onTokensChange(newTokens);
    }, [onHtmlChange, onTokensChange]);

    // Handle editor mount
    const handleEditorMount = useCallback(() => {
        setEditorMounted(true);
    }, []);

    return (
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {/* Tab header */}
            <div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <button
                    onClick={() => setActiveTab("editor")}
                    className="flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={{
                        color: activeTab === "editor" ? '#818cf8' : '#64748b',
                        borderBottom: activeTab === "editor" ? '2px solid #818cf8' : '2px solid transparent',
                        background: activeTab === "editor" ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                    }}
                >
                    <span>{"</>"}</span>
                    HTML Editor
                </button>
                <button
                    onClick={() => setActiveTab("preview")}
                    className="flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
                    style={{
                        color: activeTab === "preview" ? '#818cf8' : '#64748b',
                        borderBottom: activeTab === "preview" ? '2px solid #818cf8' : '2px solid transparent',
                        background: activeTab === "preview" ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                    }}
                >
                    <span>👁</span>
                    Live Preview
                    {tokens.length > 0 && (
                        <span
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ background: 'rgba(129, 140, 248, 0.2)', color: '#a5b4fc' }}
                        >
                            {tokens.length} tokens
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div style={{ height: '400px' }}>
                {activeTab === "editor" ? (
                    <Editor
                        height="100%"
                        defaultLanguage="html"
                        value={htmlContent}
                        onChange={handleEditorChange}
                        onMount={handleEditorMount}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: "on",
                            wordWrap: "on",
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            formatOnPaste: true,
                            folding: true,
                        }}
                        loading={
                            <div className="flex items-center justify-center h-full" style={{ color: '#94a3b8' }}>
                                Loading editor...
                            </div>
                        }
                    />
                ) : (
                    <div
                        className="h-full overflow-auto p-4"
                        style={{ background: '#ffffff' }}
                    >
                        {htmlContent ? (
                            <div
                                dangerouslySetInnerHTML={{ __html: highlightTokens(htmlContent) }}
                                style={{
                                    fontFamily: 'system-ui, sans-serif',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    color: '#1f2937',
                                }}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full" style={{ color: '#94a3b8' }}>
                                No HTML content to preview
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Token count footer */}
            <div
                className="px-4 py-2 flex items-center justify-between text-xs"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', color: '#64748b' }}
            >
                <span>
                    {tokens.length > 0
                        ? `${tokens.length} token${tokens.length !== 1 ? 's' : ''} detected`
                        : 'No tokens found (add <span class="fe-token" data-token-id="...">Label</span>)'
                    }
                </span>
                <span>
                    {htmlContent.length.toLocaleString()} characters
                </span>
            </div>
        </div>
    );
}
