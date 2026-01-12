"use client";

import { useMemo, useState } from "react";

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
	itemFields?: Field[]; // repeatable
};

type Step = {
	id: string;
	title: string;
	description?: string;
	fields: string[];
	visibilityCondition?: VisibilityCondition;
};

export type FormSchema = {
	id: string;
	version: number;
	title: string;
	description?: string;
	steps?: Step[];
	fields: Field[];
};

function getByPath(obj: any, path: string) {
	if (!path) return undefined;
	const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
	return parts.reduce((acc, p) => (acc == null ? acc : acc[p]), obj);
}

function evaluateVisibility(
	cond: VisibilityCondition | undefined,
	values: Record<string, any>
) {
	if (!cond) return true;
	const left = getByPath(values, cond.field);
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

export default function FormRenderer({
	schema,
	mode = "preview",
}: {
	schema: FormSchema;
	mode?: "preview" | "submit-disabled";
}) {
	const [values, setValues] = useState<Record<string, any>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [activeStepIdx, setActiveStepIdx] = useState(0);
	const [submitMsg, setSubmitMsg] = useState<string | null>(null);

	const visibleSteps = useMemo(() => {
		return (schema.steps ?? []).filter((s) =>
			evaluateVisibility(s.visibilityCondition, values)
		);
	}, [schema, values]);

	const currentFields = useMemo(() => {
		if (!schema.steps || schema.steps.length === 0) return schema.fields;
		const current = visibleSteps[activeStepIdx] ?? visibleSteps[0];
		if (!current) return [];
		return current.fields
			.map((k) => schema.fields.find((f) => f.key === k))
			.filter((f): f is Field => !!f)
			.filter((f) => evaluateVisibility(f.visibilityCondition, values));
	}, [schema, visibleSteps, activeStepIdx, values]);

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
				} catch {}
			}
		}
		if (typeof value === "number" && !Number.isNaN(value)) {
			if (rules.min != null && value < rules.min) return `Minimum value is ${rules.min}.`;
			if (rules.max != null && value > rules.max) return `Maximum value is ${rules.max}.`;
		}
		return null;
	}

	function validateAll(): boolean {
		const errs: Record<string, string> = {};
		for (const field of currentFields) {
			const err = validateField(field, values[field.key]);
			if (err) errs[field.key] = err;
		}
		setErrors(errs);
		return Object.keys(errs).length === 0;
	}

	function nextStep() {
		if (!validateAll()) return;
		setActiveStepIdx((i) => i + 1);
	}
	function prevStep() {
		setActiveStepIdx((i) => Math.max(0, i - 1));
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!validateAll()) return;
		setSubmitMsg(JSON.stringify(values, null, 2));
	}

	const usingSteps = !!(schema.steps && schema.steps.length > 0);
	const progressPct =
		usingSteps && visibleSteps.length > 0
			? Math.round(((activeStepIdx + 1) / visibleSteps.length) * 100)
			: 0;

	return (
		<div>
			{usingSteps && visibleSteps.length > 0 && (
				<div className="mb-4">
					<div className="mb-1 flex items-center justify-between text-sm text-gray-600">
						<span>
							Step {Math.min(activeStepIdx + 1, visibleSteps.length)} of {visibleSteps.length}
						</span>
						<span>{progressPct}%</span>
					</div>
					<div className="h-2 w-full rounded bg-gray-200">
						<div className="h-2 rounded bg-black" style={{ width: `${progressPct}%` }} />
					</div>
				</div>
			)}
			<form className="space-y-3" onSubmit={onSubmit}>
				{currentFields.map((field) => (
					<div key={field.key} className="space-y-1">
						<label htmlFor={field.key} className="block text-sm font-medium">
							{field.label}
							{field.required && <span className="text-red-500" aria-label="required"> *</span>}
						</label>
						{field.type === "text" && (
							<input 
								id={field.key}
								className="w-full rounded border px-3 py-2" 
								value={values[field.key] ?? ""} 
								onChange={(e) => onChange(field.key, e.target.value)}
								aria-invalid={!!errors[field.key]}
								aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
							/>
						)}
						{field.type === "email" && (
							<input 
								id={field.key}
								type="email" 
								className="w-full rounded border px-3 py-2" 
								value={values[field.key] ?? ""} 
								onChange={(e) => onChange(field.key, e.target.value)}
								aria-invalid={!!errors[field.key]}
								aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
							/>
						)}
						{field.type === "number" && (
							<input 
								id={field.key}
								type="number" 
								className="w-full rounded border px-3 py-2" 
								value={values[field.key] ?? ""} 
								onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
								aria-invalid={!!errors[field.key]}
								aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
							/>
						)}
						{field.type === "boolean" && (
							<input type="checkbox" className="h-4 w-4" checked={!!values[field.key]} onChange={(e) => onChange(field.key, e.target.checked)} />
						)}
						{field.type === "textarea" && (
							<textarea 
								id={field.key}
								className="w-full rounded border px-3 py-2" 
								rows={4} 
								value={values[field.key] ?? ""} 
								onChange={(e) => onChange(field.key, e.target.value)}
								aria-invalid={!!errors[field.key]}
								aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
							/>
						)}
						{field.type === "select" && (
							<select 
								id={field.key}
								className="w-full rounded border px-3 py-2" 
								value={values[field.key] ?? ""} 
								onChange={(e) => onChange(field.key, e.target.value)}
								aria-invalid={!!errors[field.key]}
								aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
							>
								<option value="" disabled>Select…</option>
								{field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						)}
						{field.type === "radio" && (
							<div className="space-y-1">
								{field.options?.map((o) => (
									<label key={o.value} className="flex items-center gap-2">
										<input type="radio" name={field.key} value={o.value} checked={values[field.key] === o.value} onChange={(e) => onChange(field.key, e.target.value)} />
										<span>{o.label}</span>
									</label>
								))}
							</div>
						)}
						{field.type === "checkboxGroup" && (
							<div className="space-y-1">
								{field.options?.map((o) => {
									const selected: string[] = values[field.key] ?? [];
									const checked = selected.includes(o.value);
									return (
										<label key={o.value} className="flex items-center gap-2">
											<input type="checkbox" checked={checked} onChange={(e) => {
												const next = new Set(selected);
												if (e.target.checked) next.add(o.value); else next.delete(o.value);
												onChange(field.key, Array.from(next));
											}} />
											<span>{o.label}</span>
										</label>
									);
								})}
							</div>
						)}
						{field.type === "date" && (
							<input type="date" className="w-full rounded border px-3 py-2" value={values[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} />
						)}
						{errors[field.key] && (
							<p 
								className="text-xs text-red-600" 
								role="alert"
								aria-live="polite"
								id={`${field.key}-error`}
							>
								{errors[field.key]}
							</p>
						)}
						{field.helpText && (
							<p className="text-xs text-gray-500" id={`${field.key}-help`}>
								{field.helpText}
							</p>
						)}
					</div>
				))}
				{usingSteps ? (
					<div className="mt-4 flex items-center justify-between">
						<button type="button" className="rounded border px-4 py-1.5 transition-all active:scale-95 active:opacity-80 disabled:opacity-50" onClick={prevStep} disabled={activeStepIdx === 0}>Back</button>
						<button type="button" className="rounded bg-black px-4 py-1.5 text-white transition-all active:scale-95 active:opacity-90" onClick={nextStep}>Next</button>
					</div>
				) : (
					<button type="submit" className="rounded bg-black px-4 py-2 text-white transition-all active:scale-95 active:opacity-90">Preview submit</button>
				)}
			</form>
			{submitMsg && (
				<pre className="mt-4 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-xs">{submitMsg}</pre>
			)}
		</div>
	);
}








