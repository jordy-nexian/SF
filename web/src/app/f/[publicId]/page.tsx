"use client";

import { useEffect, useMemo, useState } from "react";

type FieldType =
	| "text"
	| "textarea"
	| "email"
	| "number"
	| "boolean"
	| "select"
	| "radio"
	| "checkboxGroup"
	| "date"
	| "repeatable";

type ValidationRule = {
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	min?: number;
	max?: number;
	required?: boolean;
};

type VisibilityCondition = {
	field: string;
	operator: "equals" | "not_equals" | "greater_than" | "less_than" | "in";
	value: any;
};

type Field = {
	key: string;
	type: FieldType;
	label: string;
	helpText?: string;
	required?: boolean;
	validation?: ValidationRule;
	options?: { value: string; label: string }[];
	visibilityCondition?: VisibilityCondition;
	itemFields?: Field[]; // for repeatable
};

type Step = {
	id: string;
	title: string;
	description?: string;
	fields: string[]; // references to Field.key
	visibilityCondition?: VisibilityCondition;
};

type FormSchema = {
	id: string;
	version: number;
	title: string;
	description?: string;
	steps?: Step[];
	fields: Field[];
};

export default function PublicFormPage({
	params,
}: {
	params: { publicId: string };
}) {
	const [loading, setLoading] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitOk, setSubmitOk] = useState<string | null>(null);
	const [schema, setSchema] = useState<FormSchema | null>(null);
	const [formId, setFormId] = useState<string>("");
	const [formVersion, setFormVersion] = useState<number>(0);
	const [values, setValues] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeStepIdx, setActiveStepIdx] = useState(0);

	useEffect(() => {
		let active = true;
		setLoading(true);
		fetch(`/api/forms/${params.publicId}`)
			.then(async (r) => {
				if (!r.ok) throw new Error("Form not found");
				return r.json();
			})
			.then((data) => {
				if (!active) return;
				setFormId(data.formId);
				setFormVersion(data.formVersion);
				setSchema(data.schema);
				setValues({});
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
	}, [params.publicId]);

	function getByPath(obj: any, path: string) {
		if (!path) return undefined;
		// minimal dot/bracket access: a.b[0].c
		const parts = path
			.replace(/\[(\d+)\]/g, ".$1")
			.split(".")
			.filter(Boolean);
		return parts.reduce((acc, p) => (acc == null ? acc : acc[p]), obj);
	}

	function evaluateVisibility(cond: VisibilityCondition | undefined, v: Record<string, any>): boolean {
		if (!cond) return true;
		const left = getByPath(v, cond.field);
		const right = cond.value;
		switch (cond.operator) {
			case "equals":
				return left === right;
			case "not_equals":
				return left !== right;
			case "greater_than":
				return Number(left) > Number(right);
			case "less_than":
				return Number(left) < Number(right);
			case "in":
				return Array.isArray(right) ? right.includes(left) : false;
			default:
				return true;
		}
	}

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
		setValues((prev) => ({ ...prev, [key]: value }));
		setErrors((prev) => {
			const copy = { ...prev };
			delete copy[key];
			return copy;
		});
	}

	function validateField(field: Field, value: any): string | null {
		const rules = field.validation || {};
		if ((field.required || rules.required) && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
			return "This field is required.";
		}
		if (typeof value === "string") {
			if (rules.minLength != null && value.length < rules.minLength) return `Minimum length is ${rules.minLength}.`;
			if (rules.maxLength != null && value.length > rules.maxLength) return `Maximum length is ${rules.maxLength}.`;
			if (rules.pattern) {
				try {
					const re = new RegExp(rules.pattern);
					if (!re.test(value)) return "Invalid format.";
				} catch {
					// ignore bad patterns
				}
			}
		}
		if (typeof value === "number" && !Number.isNaN(value)) {
			if (rules.min != null && value < rules.min) return `Minimum value is ${rules.min}.`;
			if (rules.max != null && value > rules.max) return `Maximum value is ${rules.max}.`;
		}
		return null;
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
			const res = await fetch(`/api/forms/${params.publicId}/submit`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					formId,
					formVersion,
					answers: values,
					meta: { userAgent: navigator.userAgent, language: navigator.language },
				}),
			});
			const data = await res.json();
			if (!res.ok || data.status !== "ok") {
				throw new Error(
					data?.message || "We couldn’t submit your form. Please try again."
				);
			}
			setSubmitOk("Thanks, your response has been received.");
			setValues({});
			setErrors({});
		} catch (err: any) {
			setSubmitError(err?.message || "Submission failed");
		}
	}

	if (loading) {
		return <div className="p-6">Loading…</div>;
	}
	if (formError) {
		return <div className="p-6 text-red-600">{formError}</div>;
	}
	if (!schema) {
		return <div className="p-6">Form unavailable</div>;
	}

	const usingSteps = !!(schema.steps && schema.steps.length > 0);
	const visibleSteps = useMemo(() => {
		if (!schema?.steps) return [];
		return schema.steps.filter((s) => evaluateVisibility(s.visibilityCondition, values));
	}, [schema, values]);
	const currentFields = visibleFieldsForCurrentStep();
	const progressPct =
		usingSteps && visibleSteps.length > 0
			? Math.round(((activeStepIdx + 1) / visibleSteps.length) * 100)
			: 0;

	return (
		<div className="mx-auto max-w-2xl p-6">
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
											{field.itemFields.map((sub) => (
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
