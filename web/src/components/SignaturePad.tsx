"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import SignaturePadLib from "signature_pad";

export interface SignaturePadHandle {
    /** Get signature as base64 JPEG data URL */
    toDataURL: () => string | null;
    /** Check if signature has been drawn */
    isEmpty: () => boolean;
    /** Clear the signature */
    clear: () => void;
}

interface SignaturePadProps {
    /** Token ID for form submission */
    tokenId: string;
    /** Placeholder label */
    label?: string;
    /** Callback when signature changes */
    onChange?: (dataUrl: string | null) => void;
    /** Width of signature pad */
    width?: number;
    /** Height of signature pad */
    height?: number;
}

/**
 * Signature Pad Component
 * Allows users to draw signatures with mouse/touch, exports as base64 JPEG
 */
const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
    ({ tokenId, label = "Sign here", onChange, width = 300, height = 150 }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const signaturePadRef = useRef<SignaturePadLib | null>(null);
        const [hasSignature, setHasSignature] = useState(false);

        // Initialize signature pad
        useEffect(() => {
            if (!canvasRef.current) return;

            const canvas = canvasRef.current;
            const pad = new SignaturePadLib(canvas, {
                backgroundColor: "rgb(255, 255, 255)",
                penColor: "rgb(0, 0, 0)",
            });

            // Handle signature end
            pad.addEventListener("endStroke", () => {
                setHasSignature(!pad.isEmpty());
                if (onChange) {
                    onChange(pad.isEmpty() ? null : pad.toDataURL("image/jpeg", 0.8));
                }
            });

            signaturePadRef.current = pad;

            return () => {
                pad.off();
            };
        }, [onChange]);

        // Expose methods via ref
        useImperativeHandle(ref, () => ({
            toDataURL: () => {
                if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
                    return null;
                }
                return signaturePadRef.current.toDataURL("image/jpeg", 0.8);
            },
            isEmpty: () => signaturePadRef.current?.isEmpty() ?? true,
            clear: () => {
                signaturePadRef.current?.clear();
                setHasSignature(false);
                if (onChange) onChange(null);
            },
        }));

        const handleClear = () => {
            signaturePadRef.current?.clear();
            setHasSignature(false);
            if (onChange) onChange(null);
        };

        return (
            <div
                className="signature-pad-container"
                data-token-id={tokenId}
                style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    gap: "8px",
                    maxWidth: "100%",
                }}
            >
                {/* Label */}
                <div
                    style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontWeight: 500,
                    }}
                >
                    {label} <span style={{ color: "#ef4444" }}>*</span>
                </div>

                {/* Canvas container */}
                <div
                    style={{
                        border: hasSignature ? "2px solid #10b981" : "2px dashed #d1d5db",
                        borderRadius: "8px",
                        overflow: "hidden",
                        background: "#ffffff",
                        transition: "border-color 0.2s",
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={width}
                        height={height}
                        style={{
                            display: "block",
                            cursor: "crosshair",
                            touchAction: "none",
                        }}
                    />
                </div>

                {/* Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        Clear
                    </button>
                    {hasSignature ? (
                        <span style={{ fontSize: "12px", color: "#10b981" }}>
                            ✓ Signature captured
                        </span>
                    ) : (
                        <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                            Draw your signature above
                        </span>
                    )}
                </div>

                {/* Hidden input for form submission */}
                <input
                    type="hidden"
                    name={tokenId}
                    id={`sig-${tokenId}`}
                    data-signature-input="true"
                />
            </div>
        );
    }
);

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
