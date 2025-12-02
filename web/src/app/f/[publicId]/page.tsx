"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import type {
	FormSchema,
	Field,
	VisibilityCondition,
} from "@/types/form-schema";
import { evaluateVisibility, validateField, getByPath } from "@/types/form-schema";
import { themeToCssVars, type ThemeConfig } from "@/types/theme";

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

	// Extract pre-fill values from URL parameters
	function getPrefillValues(fieldKeys: string[]): Record<string, any> {
		const prefill: Record<string, any> = {};
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
				const data = await r.json();
				if (!r.ok) {
					throw new Error(data.error || data.message || "Form not found");
				}
				return data;
			})
			.then((data) => {
				if (!active) return;
				setFormId(data.formId);
				setFormVersion(data.formVersion);
				setSchema(data.schema);
				setTheme(data.theme);
				setThankYouUrl(data.thankYouUrl);
				setThankYouMessage(data.thankYouMessage);

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

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitOk(null);
		setSubmitError(null);
		// Validate everything (single page) or current step if stepped but on last screen we validate current and allow submit
		const fieldsToValidate =
			schema?.steps && schema.steps.length > 0
				? visibleFieldsForCurrentStep()
				: orderedFields;
		if (!validateStep(fieldsToValidate)) {
			setSubmitError("Please fix the highlighted errors.");
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

	return (
		<div
			className="mx-auto max-w-2xl p-6"
			style={themeStyle as React.CSSProperties}
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

			<h1 className="text-2xl font-semibold">{schema.title}</h1>
			{schema.description && (
				<p className="mt-2 text-gray-600">{schema.description}</p>
			)}
			{usingSteps && visibleSteps.length > 0 && (
				<div className="mt-4">
					<div className="mb-2 flex items-center justify-between text-sm text-gray-600">
						<span>
							Step {Math.min(activeStepIdx + 1, visibleSteps.length)} of {visibleSteps.length}
						</span>
						<span>{progressPct}%</span>
					</div>
					<div className="h-2 w-full rounded bg-gray-200">
						<div
							className="h-2 rounded bg-black"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
					{visibleSteps[activeStepIdx]?.title && (
						<h2 className="mt-4 text-xl font-medium">
							{visibleSteps[activeStepIdx]?.title}
						</h2>
					)}
					{visibleSteps[activeStepIdx]?.description && (
						<p className="text-gray-600">
							{visibleSteps[activeStepIdx]?.description}
						</p>
					)}
				</div>
			)}
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				{currentFields.map((field) => (
					<div key={field.key} className="space-y-1">
						<label className="block text-sm font-medium">
							{field.label}
							{field.required ? " *" : ""}
						</label>
						{field.type === "text" && (
							<input
								type="text"
								className="w-full rounded border px-3 py-2"
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "email" && (
							<input
								type="email"
								className="w-full rounded border px-3 py-2"
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "number" && (
							<input
								type="number"
								className="w-full rounded border px-3 py-2"
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
								required={field.required}
							/>
						)}
						{field.type === "boolean" && (
							<input
								type="checkbox"
								className="h-4 w-4"
								checked={!!values[field.key]}
								onChange={(e) => onChange(field.key, e.target.checked)}
							/>
						)}
						{field.type === "textarea" && (
							<textarea
								className="w-full rounded border px-3 py-2"
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
								rows={4}
							/>
						)}
						{field.type === "select" && (
							<select
								className="w-full rounded border px-3 py-2"
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
							<div className="space-y-1">
								{field.options?.map((opt) => (
									<label key={opt.value} className="flex items-center gap-2">
										<input
											type="radio"
											name={field.key}
											value={opt.value}
											checked={values[field.key] === opt.value}
											onChange={(e) => onChange(field.key, e.target.value)}
										/>
										<span>{opt.label}</span>
									</label>
								))}
							</div>
						)}
						{field.type === "checkboxGroup" && (
							<div className="space-y-1">
								{field.options?.map((opt) => {
									const selected: string[] = values[field.key] ?? [];
									const checked = selected.includes(opt.value);
									return (
										<label key={opt.value} className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={checked}
												onChange={(e) => {
													const next = new Set(selected);
													if (e.target.checked) next.add(opt.value);
													else next.delete(opt.value);
													onChange(field.key, Array.from(next));
												}}
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
								className="w-full rounded border px-3 py-2"
								value={values[field.key] ?? ""}
								onChange={(e) => onChange(field.key, e.target.value)}
								required={field.required}
							/>
						)}
						{field.type === "repeatable" && field.itemFields && (
							<div className="space-y-2">
								{((values[field.key] as any[]) ?? []).map((row, idx) => (
									<div key={idx} className="rounded border p-3">
										<div className="flex items-center justify-between">
											<div className="text-sm font-medium">Item {idx + 1}</div>
											<button
												type="button"
												className="text-sm text-red-600"
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
										<div className="mt-2 grid gap-3">
											{(field.itemFields ?? []).map((sub) => (
												<div key={sub.key} className="space-y-1">
													<label className="block text-sm">
														{sub.label}
														{sub.required ? " *" : ""}
													</label>
													<input
														type={sub.type === "number" ? "number" : "text"}
														className="w-full rounded border px-3 py-2"
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
														<p className="text-xs text-red-600">
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
										className="rounded border px-3 py-1 text-sm"
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
							<p className="text-xs text-gray-500">{field.helpText}</p>
						)}
						{errors[field.key] && (
							<p className="text-xs text-red-600">{errors[field.key]}</p>
						)}
					</div>
				))}
				{usingSteps ? (
					<div className="mt-4 flex items-center justify-between">
						<button
							type="button"
							className="rounded border px-4 py-2"
							onClick={prevStep}
							disabled={activeStepIdx === 0}
						>
							Back
						</button>
						{activeStepIdx < Math.max(visibleSteps.length - 1, 0) ? (
							<button
								type="button"
								className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
								onClick={nextStep}
							>
								Next
							</button>
						) : (
							<button
								type="submit"
								className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
							>
								Submit
							</button>
						)}
					</div>
				) : (
					<div className="pt-2">
						<button
							type="submit"
							className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
						>
							Submit
						</button>
					</div>
				)}
				{submitOk && <p className="text-green-600">{submitOk}</p>}
				{submitError && <p className="text-red-600">{submitError}</p>}
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
