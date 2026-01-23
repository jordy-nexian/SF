"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import type {
	FormSchema,
	Field,
	VisibilityCondition,
} from "@/types/form-schema";
import { evaluateVisibility, validateField, getByPath } from "@/types/form-schema";
import { themeToCssVars, type ThemeConfig } from "@/types/theme";
import TurnstileWidget from "@/components/TurnstileWidget";
import { replaceTokensWithValues } from "@/lib/html-template-parser";

// Storage key for partial submission recovery
const STORAGE_PREFIX = "stateless-form:";

function PublicFormContent() {
	const params = useParams();
	const publicId = params.publicId as string;
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitOk, setSubmitOk] = useState<string | null>(null);
	const [schema, setSchema] = useState<FormSchema | null>(null);
	const [htmlContent, setHtmlContent] = useState<string | null>(null);
	const [theme, setTheme] = useState<ThemeConfig | null>(null);
	const [formId, setFormId] = useState<string>("");
	const [formVersion, setFormVersion] = useState<number>(0);
	const [values, setValues] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeStepIdx, setActiveStepIdx] = useState(0);
	const [thankYouUrl, setThankYouUrl] = useState<string | null>(null);
	const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
	const [submissionId, setSubmissionId] = useState<string | null>(null);
	const [recoveredFromStorage, setRecoveredFromStorage] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
	const [turnstileError, setTurnstileError] = useState<string | null>(null);
	const [prefilling, setPrefilling] = useState(false);
	const [prefillData, setPrefillData] = useState<Record<string, any>>({});

	// Extract pre-fill values from URL parameters
	// Supports both individual field params and ?data=base64(JSON)
	function getPrefillValues(fieldKeys: string[]): Record<string, any> {
		const prefill: Record<string, any> = {};

		// First, check for base64-encoded data payload (from Quickbase/N8N)
		const dataParam = searchParams.get("data");
		if (dataParam) {
			try {
				// Decode base64 and parse JSON
				const decoded = atob(dataParam);
				const payload = JSON.parse(decoded);
				// Copy all matching field keys from payload
				for (const key of fieldKeys) {
					if (payload[key] !== undefined) {
						prefill[key] = payload[key];
					}
				}
				// Also check for any keys in payload that might be mappings
				// (the API will have already applied token mappings)
				Object.keys(payload).forEach(payloadKey => {
					if (fieldKeys.includes(payloadKey)) {
						prefill[payloadKey] = payload[payloadKey];
					}
				});
			} catch {
				console.warn("Failed to decode data parameter");
			}
		}

		// Then, individual URL params (which override ?data values)
		for (const key of fieldKeys) {
			const value = searchParams.get(key);
			if (value !== null) {
				// Try to parse as JSON for arrays/objects, otherwise use string
				try {
					prefill[key] = JSON.parse(value);
				} catch {
					prefill[key] = value;
				}
			}
		}
		return prefill;
	}

	// Load saved partial submission from localStorage
	function loadFromStorage(): Record<string, any> | null {
		if (typeof window === "undefined") return null;
		try {
			const stored = localStorage.getItem(`${STORAGE_PREFIX}${publicId}`);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Check if data is less than 24 hours old
				if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
					return parsed.values;
				}
				// Remove stale data
				localStorage.removeItem(`${STORAGE_PREFIX}${publicId}`);
			}
		} catch {
			// Ignore storage errors
		}
		return null;
	}

	// Save partial submission to localStorage
	function saveToStorage(vals: Record<string, any>) {
		if (typeof window === "undefined") return;
		try {
			localStorage.setItem(
				`${STORAGE_PREFIX}${publicId}`,
				JSON.stringify({ values: vals, timestamp: Date.now() })
			);
		} catch {
			// Ignore storage errors (quota exceeded, etc.)
		}
	}

	// Clear saved submission
	function clearStorage() {
		if (typeof window === "undefined") return;
		try {
			localStorage.removeItem(`${STORAGE_PREFIX}${publicId}`);
		} catch {
			// Ignore
		}
	}

	useEffect(() => {
		let active = true;
		setLoading(true);
		fetch(`/api/forms/${publicId}`)
			.then(async (r) => {
				const json = await r.json();
				if (!r.ok) {
					// Handle standardized error response format
					const errorMsg = json.error?.message || json.message || json.error || "Form not found";
					throw new Error(errorMsg);
				}
				// Handle standardized success response format: { success: true, data: {...} }
				return json.data ?? json;
			})
			.then((data) => {
				if (!active) return;
				setFormId(data.formId);
				setFormVersion(data.formVersion);
				setSchema(data.schema);
				setHtmlContent(data.htmlContent || null);
				setTheme(data.theme);
				setThankYouUrl(data.thankYouUrl);
				setThankYouMessage(data.thankYouMessage);
				setTurnstileSiteKey(data.turnstileSiteKey || null);

				// Initialize values: URL params > localStorage > empty
				const fieldKeys = data.schema.fields.map((f: Field) => f.key);
				const prefillValues = getPrefillValues(fieldKeys);
				const storedValues = loadFromStorage();

				if (Object.keys(prefillValues).length > 0) {
					// URL params take priority
					setValues(prefillValues);
				} else if (storedValues && Object.keys(storedValues).length > 0) {
					setValues(storedValues);
					setRecoveredFromStorage(true);
				} else {
					setValues({});
				}

				setErrors({});
				setActiveStepIdx(0);
				setFormError(null);

				// Fetch prefill data from webhook (if configured)
				// Always attempt prefill - query params are forwarded if present
				const queryString = window.location.search || '';
				setPrefilling(true);
				fetch(`/api/forms/${publicId}/prefill${queryString}`)
					.then(res => res.json())
					.then(prefillResponse => {
						if (prefillResponse.success && prefillResponse.data?.prefillData) {
							const fetchedPrefillData = prefillResponse.data.prefillData;
							if (Object.keys(fetchedPrefillData).length > 0) {
								setPrefillData(fetchedPrefillData);
								setValues(prev => ({ ...prev, ...fetchedPrefillData }));
							}
						}
					})
					.catch(err => {
						console.warn('Prefill failed:', err);
						// Silent failure - form still works
					})
					.finally(() => setPrefilling(false));
			})
			.catch((e) => {
				if (!active) return;
				setFormError(e.message || "Unable to load form");
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [publicId, searchParams]);

	const orderedFields = useMemo(() => {
		if (!schema) return [];
		if (schema.steps && schema.steps.length > 0) {
			const visibleSteps = schema.steps.filter((s) =>
				evaluateVisibility(s.visibilityCondition, values)
			);
			const fieldKeys = visibleSteps.flatMap((s) => s.fields);
			return fieldKeys
				.map((k) => schema.fields.find((f) => f.key === k))
				.filter(Boolean) as Field[];
		}
		return schema.fields;
	}, [schema]);

	// Process HTML content with prefill values
	// This replaces fe-token spans with actual values from the webhook
	const processedHtmlContent = useMemo(() => {
		if (!htmlContent) return null;
		if (Object.keys(prefillData).length === 0) return htmlContent;
		// prefillData is keyed by tokenId, which matches data-token-id in HTML
		return replaceTokensWithValues(htmlContent, prefillData);
	}, [htmlContent, prefillData]);

	function onChange(key: string, value: any) {
		setValues((prev) => {
			const next = { ...prev, [key]: value };
			// Save to localStorage for recovery
			saveToStorage(next);
			return next;
		});
		setErrors((prev) => {
			const copy = { ...prev };
			delete copy[key];
			return copy;
		});
		// Clear recovery notice once user starts editing
		if (recoveredFromStorage) {
			setRecoveredFromStorage(false);
		}
	}

	function validateStep(stepFields: Field[]): boolean {
		const stepErrors: Record<string, string> = {};
		for (const field of stepFields) {
			if (!evaluateVisibility(field.visibilityCondition, values)) continue;
			if (field.type === "repeatable" && field.itemFields) {
				const arr = (values[field.key] as any[]) || [];
				arr.forEach((row, idx) => {
					for (const sub of field.itemFields!) {
						const key = `${field.key}[${idx}].${sub.key}`;
						const err = validateField(sub, row?.[sub.key]);
						if (err) stepErrors[key] = err;
					}
				});
				continue;
			}
			const err = validateField(field, values[field.key]);
			if (err) stepErrors[field.key] = err;
		}
		setErrors(stepErrors);
		return Object.keys(stepErrors).length === 0;
	}

	function visibleFieldsForCurrentStep(): Field[] {
		if (!schema) return [];
		if (!schema.steps || schema.steps.length === 0) return orderedFields;
		// compute visible steps and pick active index within them
		const visibleSteps = schema.steps.filter((s) =>
			evaluateVisibility(s.visibilityCondition, values)
		);
		const current = visibleSteps[activeStepIdx] ?? visibleSteps[0];
		if (!current) return [];
		return current.fields
			.map((k) => schema.fields.find((f) => f.key === k))
			.filter((f): f is Field => !!f)
			.filter((f) => evaluateVisibility(f.visibilityCondition, values));
	}

	function nextStep() {
		if (!schema?.steps || schema.steps.length === 0) return;
		const fields = visibleFieldsForCurrentStep();
		if (!validateStep(fields)) return;
		setActiveStepIdx((i) => i + 1);
	}

	function prevStep() {
		if (!schema?.steps || schema.steps.length === 0) return;
		setActiveStepIdx((i) => Math.max(0, i - 1));
	}

	// Turnstile handlers
	const handleTurnstileVerify = useCallback((token: string) => {
		setTurnstileToken(token);
		setTurnstileError(null);
	}, []);

	const handleTurnstileError = useCallback(() => {
		setTurnstileToken(null);
		setTurnstileError("Verification failed. Please try again.");
	}, []);

	const handleTurnstileExpired = useCallback(() => {
		setTurnstileToken(null);
	}, []);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitOk(null);
		setSubmitError(null);
		setTurnstileError(null);

		// Validate everything (single page) or current step if stepped but on last screen we validate current and allow submit
		const fieldsToValidate =
			schema?.steps && schema.steps.length > 0
				? visibleFieldsForCurrentStep()
				: orderedFields;
		if (!validateStep(fieldsToValidate)) {
			setSubmitError("Please fix the highlighted errors.");
			return;
		}

		// Verify Turnstile if enabled
		if (turnstileSiteKey && !turnstileToken) {
			setTurnstileError("Please complete the verification challenge.");
			return;
		}

		try {
			const res = await fetch(`/api/forms/${publicId}/submit`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					formId,
					formVersion,
					answers: values,
					turnstileToken: turnstileToken || undefined,
					meta: {
						userAgent: navigator.userAgent,
						language: navigator.language,
						stepReached: activeStepIdx + 1,
					},
				}),
			});
			const data = await res.json();
			if (!res.ok || data.status !== "ok") {
				throw new Error(
					data?.message || "We couldn't submit your form. Please try again."
				);
			}

			// Clear localStorage on successful submission
			clearStorage();

			// Store submission ID for receipt
			setSubmissionId(data.submissionId);

			// Handle redirect or show thank you message
			if (thankYouUrl) {
				window.location.href = thankYouUrl;
				return;
			}

			setSubmitOk(thankYouMessage || "Thanks, your response has been received.");
			setValues({});
			setErrors({});

			// Post message for embed integration
			if (window.parent !== window) {
				window.parent.postMessage(
					JSON.stringify({
						type: "stateless-form-submitted",
						formId,
						submissionId: data.submissionId,
					}),
					"*"
				);
			}
		} catch (err: any) {
			setSubmitError(err?.message || "Submission failed");
		}
	}

	// All hooks must be called before any early returns to avoid React error #310
	const visibleSteps = useMemo(() => {
		if (!schema?.steps) return [];
		return schema.steps.filter((s) => evaluateVisibility(s.visibilityCondition, values));
	}, [schema, values]);

	const themeStyle = useMemo(() => {
		return theme ? themeToCssVars(theme) : {};
	}, [theme]);

	// Early returns after all hooks
	if (loading) {
		return <div className="p-6">Loading…</div>;
	}
	if (formError) {
		return (
			<div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafc' }}>
				<div className="text-center max-w-md">
					<div className="text-6xl mb-4">📋</div>
					<h1 className="text-xl font-semibold text-gray-800 mb-2">Form Unavailable</h1>
					<p className="text-gray-600">{formError}</p>
				</div>
			</div>
		);
	}
	if (!schema) {
		return <div className="p-6">Form unavailable</div>;
	}

	// Handle HTML template form submission
	async function handleHtmlFormSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSubmitError(null);

		// Collect all form data from the HTML template
		const formData = new FormData(e.currentTarget);
		const answers: Record<string, any> = {};
		formData.forEach((value, key) => {
			// Handle multiple values (like checkboxes) by making them arrays
			if (answers[key]) {
				if (Array.isArray(answers[key])) {
					answers[key].push(value);
				} else {
					answers[key] = [answers[key], value];
				}
			} else {
				answers[key] = value;
			}
		});

		try {
			const res = await fetch(`/api/forms/${publicId}/submit`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					formId,
					formVersion,
					answers,
					meta: {
						userAgent: navigator.userAgent,
						language: navigator.language,
						htmlTemplate: true,
					},
				}),
			});
			const data = await res.json();
			if (!res.ok || data.status !== "ok") {
				throw new Error(
					data?.message || "We couldn't submit your form. Please try again."
				);
			}

			setSubmissionId(data.submissionId);
			setSubmitOk(thankYouMessage || "Thanks, your response has been received.");

			// Handle redirect
			if (thankYouUrl) {
				window.location.href = thankYouUrl;
			}
		} catch (err: any) {
			setSubmitError(err?.message || "Submission failed");
		}
	}

	// If HTML content is available, render it instead of schema-based form
	if (htmlContent) {
		// Show success message if submitted
		if (submitOk && submissionId) {
			return (
				<div
					className="min-h-screen py-8 px-4 flex items-center justify-center"
					style={{ backgroundColor: "#f3f4f6" }}
				>
					<div
						className="text-center p-8 bg-white rounded-lg shadow-lg"
						style={{ maxWidth: "500px" }}
					>
						<div className="text-6xl mb-4">✓</div>
						<h2 className="text-2xl font-semibold text-green-700 mb-2">
							{thankYouMessage || "Thank you!"}
						</h2>
						<p className="text-gray-600 mb-4">{submitOk}</p>
						<div className="bg-gray-50 rounded p-3 text-sm">
							<div className="text-gray-500">Submission ID</div>
							<div className="font-mono text-gray-800">{submissionId}</div>
						</div>
					</div>
				</div>
			);
		}

		return (
			<div
				className="min-h-screen pb-20"
				style={{
					...themeStyle as React.CSSProperties,
					backgroundColor: "#f3f4f6",
				}}
			>
				{/* Main content with padding for fixed bottom bar */}
				<div className="py-8 px-4">
					<form id="html-template-form" onSubmit={handleHtmlFormSubmit}>
						{/* A4-like paper container */}
						<div
							className="html-template-form"
							dangerouslySetInnerHTML={{ __html: processedHtmlContent || '' }}
							style={{
								maxWidth: "850px",
								margin: "0 auto",
								backgroundColor: "#ffffff",
								padding: "40px 60px",
								borderRadius: "4px",
								boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
								fontFamily: "var(--form-font, system-ui)",
								color: "var(--form-text, #1f2937)",
							}}
						/>
					</form>
				</div>

				{/* Fixed Bottom Bar */}
				<div
					style={{
						position: "fixed",
						bottom: 0,
						left: 0,
						right: 0,
						backgroundColor: "#ffffff",
						borderTop: "1px solid #e5e7eb",
						boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
						zIndex: 50,
					}}
				>
					<div
						style={{
							maxWidth: "850px",
							margin: "0 auto",
							padding: "16px 24px",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "16px",
						}}
					>
						{/* Status area (left side) */}
						<div style={{ flex: 1 }}>
							{prefilling && (
								<div
									style={{
										padding: "8px 12px",
										borderRadius: "6px",
										backgroundColor: "#eff6ff",
										border: "1px solid #bfdbfe",
										color: "#2563eb",
										fontSize: "14px",
										display: "flex",
										alignItems: "center",
										gap: "8px",
									}}
								>
									<span style={{ animation: "spin 1s linear infinite" }}>⟳</span>
									Prefilling form data...
								</div>
							)}
							{!prefilling && submitError && (
								<div
									style={{
										padding: "8px 12px",
										borderRadius: "6px",
										backgroundColor: "#fef2f2",
										border: "1px solid #fecaca",
										color: "#dc2626",
										fontSize: "14px",
									}}
								>
									{submitError}
								</div>
							)}
						</div>

						{/* Submit button (right side) */}
						<button
							type="submit"
							form="html-template-form"
							style={{
								padding: "12px 32px",
								fontSize: "16px",
								fontWeight: 600,
								color: "#fff",
								background: "linear-gradient(to right, #6366f1, #8b5cf6)",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								transition: "all 0.2s",
								boxShadow: "0 4px 15px rgba(99, 102, 241, 0.3)",
								whiteSpace: "nowrap",
							}}
						>
							Submit Form →
						</button>
					</div>
				</div>
			</div>
		);
	}

	const usingSteps = !!(schema.steps && schema.steps.length > 0);
	const currentFields = visibleFieldsForCurrentStep();
	const progressPct =
		usingSteps && visibleSteps.length > 0
			? Math.round(((activeStepIdx + 1) / visibleSteps.length) * 100)
			: 0;

	// Show submission receipt if submitted
	if (submitOk && submissionId) {
		return (
			<div
				className="mx-auto max-w-2xl p-6"
				style={themeStyle as React.CSSProperties}
			>
				<div className="rounded-lg border bg-green-50 p-6 text-center">
					<div className="mb-4 text-4xl">✓</div>
					<h2 className="mb-2 text-xl font-semibold text-green-800">
						{thankYouMessage || "Thank you!"}
					</h2>
					<p className="text-green-700">{submitOk}</p>
					<div className="mt-4 rounded bg-white p-3 text-sm">
						<div className="text-gray-500">Submission ID</div>
						<div className="font-mono text-gray-800">{submissionId}</div>
						<div className="mt-1 text-xs text-gray-400">
							{new Date().toLocaleString()}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Themed input styles using CSS variables
	const inputStyle: React.CSSProperties = {
		width: "100%",
		backgroundColor: "transparent",
		border: "1px solid var(--form-border, #d1d5db)",
		borderRadius: "var(--form-radius, 0.375rem)",
		padding: "var(--form-input-padding, 0.5rem 0.75rem)",
		color: "var(--form-text, #1f2937)",
		fontSize: "var(--form-font-size, 1rem)",
		outline: "none",
	};

	const buttonStyle: React.CSSProperties = {
		backgroundColor: "var(--form-btn-bg, #000)",
		color: "var(--form-btn-text, #fff)",
		borderRadius: "var(--form-radius, 0.375rem)",
		padding: "var(--form-input-padding, 0.5rem 0.75rem)",
		border: "none",
		cursor: "pointer",
		fontWeight: 500,
	};

	const secondaryButtonStyle: React.CSSProperties = {
		backgroundColor: "transparent",
		color: "var(--form-text, #1f2937)",
		borderRadius: "var(--form-radius, 0.375rem)",
		padding: "var(--form-input-padding, 0.5rem 0.75rem)",
		border: "1px solid var(--form-border, #d1d5db)",
		cursor: "pointer",
	};

	return (
		<div
			className="mx-auto max-w-2xl p-6"
			style={{
				...themeStyle as React.CSSProperties,
				backgroundColor: "var(--form-bg, #ffffff)",
				color: "var(--form-text, #1f2937)",
				fontFamily: "var(--form-font, system-ui)",
			}}
		>
			{/* Recovery notice */}
			{recoveredFromStorage && (
				<div className="mb-4 flex items-center justify-between rounded bg-blue-50 p-3 text-sm text-blue-800">
					<span>We restored your previous progress.</span>
					<button
						type="button"
						onClick={() => {
							clearStorage();
							setValues({});
							setRecoveredFromStorage(false);
						}}
						className="text-blue-600 underline"
					>
						Start fresh
					</button>
				</div>
			)}

			<h1 style={{ fontSize: "var(--form-heading-size, 1.5rem)", fontWeight: 600 }}>{schema.title}</h1>
			{schema.description && (
				<p style={{ marginTop: "0.5rem", opacity: 0.7 }}>{schema.description}</p>
			)}
			{usingSteps && visibleSteps.length > 0 && (
				<div style={{ marginTop: "1rem" }}>
					<div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.875rem", opacity: 0.7 }}>
						<span>
							Step {Math.min(activeStepIdx + 1, visibleSteps.length)} of {visibleSteps.length}
						</span>
						<span>{progressPct}%</span>
					</div>
					<div style={{ height: "0.5rem", width: "100%", borderRadius: "var(--form-radius, 0.375rem)", backgroundColor: "var(--form-border, #d1d5db)", overflow: "hidden" }}>
						<div
							style={{
								height: "100%",
								borderRadius: "var(--form-radius, 0.375rem)",
								backgroundColor: "var(--form-primary, #000)",
								width: `${progressPct}%`,
								transition: "width 0.3s ease",
							}}
						/>
					</div>
					{visibleSteps[activeStepIdx]?.title && (
						<h2 style={{ marginTop: "1rem", fontSize: "1.25rem", fontWeight: 500 }}>
							{visibleSteps[activeStepIdx]?.title}
						</h2>
					)}
					{visibleSteps[activeStepIdx]?.description && (
						<p style={{ opacity: 0.7 }}>
							{visibleSteps[activeStepIdx]?.description}
						</p>
					)}
				</div>
			)}
			<form className="mt-6" style={{ display: "flex", flexDirection: "column", gap: "var(--form-field-spacing, 1rem)" }} onSubmit={onSubmit}>
				{currentFields.map((field) => (
					<div key={field.key} style={{ marginBottom: "var(--form-field-spacing, 0)" }}>
						<label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>
							{field.label}
							{field.required && <span style={{ color: "var(--form-error, #dc2626)" }}> *</span>}
						</label>
						{field.type === "text" && (
							<input
								type="text"
								style={inputStyle}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "email" && (
							<input
								type="email"
								style={inputStyle}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "number" && (
							<input
								type="number"
								style={inputStyle}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
								required={field.required}
							/>
						)}
						{field.type === "boolean" && (
							<input
								type="checkbox"
								style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--form-primary, #000)" }}
								checked={!!values[field.key]}
								onChange={(e) => onChange(field.key, e.target.checked)}
							/>
						)}
						{field.type === "textarea" && (
							<textarea
								style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
								rows={4}
							/>
						)}
						{field.type === "select" && (
							<select
								style={inputStyle}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							>
								<option value="" disabled>
									Select…
								</option>
								{field.options?.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						)}
						{field.type === "radio" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								{field.options?.map((opt) => (
									<label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
										<input
											type="radio"
											name={field.key}
											value={opt.value}
											checked={values[field.key] === opt.value}
											onChange={(e) => onChange(field.key, e.target.value)}
											style={{ accentColor: "var(--form-primary, #000)" }}
										/>
										<span>{opt.label}</span>
									</label>
								))}
							</div>
						)}
						{field.type === "checkboxGroup" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								{field.options?.map((opt) => {
									const selected: string[] = values[field.key] ?? [];
									const checked = selected.includes(opt.value);
									return (
										<label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
											<input
												type="checkbox"
												checked={checked}
												onChange={(e) => {
													const next = new Set(selected);
													if (e.target.checked) next.add(opt.value);
													else next.delete(opt.value);
													onChange(field.key, Array.from(next));
												}}
												style={{ width: "1rem", height: "1rem", accentColor: "var(--form-primary, #000)" }}
											/>
											<span>{opt.label}</span>
										</label>
									);
								})}
							</div>
						)}
						{field.type === "date" && (
							<input
								type="date"
								style={inputStyle}
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "repeatable" && field.itemFields && (
							<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								{((values[field.key] as any[]) ?? []).map((row, idx) => (
									<div key={idx} style={{ border: "1px solid var(--form-border, #d1d5db)", borderRadius: "var(--form-radius, 0.375rem)", padding: "0.75rem" }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div style={{ fontSize: "0.875rem", fontWeight: 500 }}>Item {idx + 1}</div>
											<button
												type="button"
												style={{ fontSize: "0.875rem", color: "var(--form-error, #dc2626)", background: "none", border: "none", cursor: "pointer" }}
												onClick={() => {
													const arr = Array.isArray(values[field.key])
														? [...(values[field.key] as any[])]
														: [];
													arr.splice(idx, 1);
													onChange(field.key, arr);
												}}
											>
												Remove
											</button>
										</div>
										<div style={{ marginTop: "0.5rem", display: "grid", gap: "0.75rem" }}>
											{(field.itemFields ?? []).map((sub) => (
												<div key={sub.key}>
													<label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
														{sub.label}
														{sub.required && <span style={{ color: "var(--form-error, #dc2626)" }}> *</span>}
													</label>
													<input
														type={sub.type === "number" ? "number" : "text"}
														style={inputStyle}
														value={(row?.[sub.key] as any) ?? ""}
														onChange={(e) => {
															const arr = Array.isArray(values[field.key])
																? [...(values[field.key] as any[])]
																: [];
															const updated = { ...(arr[idx] ?? {}) };
															updated[sub.key] =
																sub.type === "number"
																	? (e.target as HTMLInputElement).valueAsNumber
																	: (e.target as HTMLInputElement).value;
															arr[idx] = updated;
															onChange(field.key, arr);
														}}
													/>
													{errors[`${field.key}[${idx}].${sub.key}`] && (
														<p style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--form-error, #dc2626)" }}>
															{errors[`${field.key}[${idx}].${sub.key}`]}
														</p>
													)}
												</div>
											))}
										</div>
									</div>
								))}
								<div>
									<button
										type="button"
										style={secondaryButtonStyle}
										onClick={() => {
											const arr = Array.isArray(values[field.key])
												? [...(values[field.key] as any[])]
												: [];
											arr.push({});
											onChange(field.key, arr);
										}}
									>
										Add item
									</button>
								</div>
							</div>
						)}
						{field.helpText && (
							<p style={{ fontSize: "0.75rem", marginTop: "0.25rem", opacity: 0.6 }}>{field.helpText}</p>
						)}
						{errors[field.key] && (
							<p style={{ fontSize: "0.75rem", marginTop: "0.25rem", color: "var(--form-error, #dc2626)" }}>{errors[field.key]}</p>
						)}
					</div>
				))}
				{/* Turnstile CAPTCHA widget - show before submit button */}
				{turnstileSiteKey && (
					<div style={{ paddingTop: "1rem" }}>
						<TurnstileWidget
							siteKey={turnstileSiteKey}
							onVerify={handleTurnstileVerify}
							onError={handleTurnstileError}
							onExpired={handleTurnstileExpired}
							theme="auto"
						/>
						{turnstileError && (
							<p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--form-error, #dc2626)" }}>{turnstileError}</p>
						)}
					</div>
				)}

				{usingSteps ? (
					<div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--form-border, #d1d5db)", paddingTop: "1rem" }}>
						<button
							type="button"
							style={{ ...secondaryButtonStyle, opacity: activeStepIdx === 0 ? 0.5 : 1 }}
							onClick={prevStep}
							disabled={activeStepIdx === 0}
						>
							Back
						</button>
						{activeStepIdx < Math.max(visibleSteps.length - 1, 0) ? (
							<button
								type="button"
								style={buttonStyle}
								onClick={nextStep}
							>
								Next
							</button>
						) : (
							<button
								type="submit"
								style={{ ...buttonStyle, opacity: (turnstileSiteKey && !turnstileToken) ? 0.5 : 1 }}
								disabled={turnstileSiteKey ? !turnstileToken : false}
							>
								Submit
							</button>
						)}
					</div>
				) : (
					<div style={{ paddingTop: "0.5rem" }}>
						<button
							type="submit"
							style={{ ...buttonStyle, opacity: (turnstileSiteKey && !turnstileToken) ? 0.5 : 1 }}
							disabled={turnstileSiteKey ? !turnstileToken : false}
						>
							Submit
						</button>
					</div>
				)}
				{submitOk && <p style={{ color: "var(--form-success, #16a34a)" }}>{submitOk}</p>}
				{submitError && <p style={{ color: "var(--form-error, #dc2626)" }}>{submitError}</p>}
			</form>
		</div>
	);
}

export default function PublicFormPage() {
	return (
		<Suspense fallback={<div className="p-6">Loading form...</div>}>
			<PublicFormContent />
		</Suspense>
	);
}
