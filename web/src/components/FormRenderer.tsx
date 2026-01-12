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
	// Layout options
	layout?: "single" | "two-column" | "card";
	fieldStyle?: "outline" | "filled" | "underline";
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

// Styles that use CSS variables for theming
const themedStyles = {
	// Input styles based on fieldStyle
	input: {
		outline: {
			backgroundColor: "transparent",
			border: "1px solid var(--form-border, #d1d5db)",
			borderRadius: "var(--form-radius, 0.375rem)",
			padding: "var(--form-input-padding, 0.5rem 0.75rem)",
			color: "var(--form-text, #1f2937)",
			fontSize: "var(--form-font-size, 1rem)",
			width: "100%",
			outline: "none",
			transition: "border-color 0.15s, box-shadow 0.15s",
		},
		filled: {
			backgroundColor: "var(--form-border, #d1d5db)",
			border: "none",
			borderBottom: "2px solid var(--form-primary, #000)",
			borderRadius: "var(--form-radius, 0.375rem) var(--form-radius, 0.375rem) 0 0",
			padding: "var(--form-input-padding, 0.5rem 0.75rem)",
			color: "var(--form-text, #1f2937)",
			fontSize: "var(--form-font-size, 1rem)",
			width: "100%",
			outline: "none",
			transition: "background-color 0.15s",
		},
		underline: {
			backgroundColor: "transparent",
			border: "none",
			borderBottom: "2px solid var(--form-border, #d1d5db)",
			borderRadius: "0",
			padding: "var(--form-input-padding, 0.5rem 0.75rem)",
			paddingLeft: "0",
			color: "var(--form-text, #1f2937)",
			fontSize: "var(--form-font-size, 1rem)",
			width: "100%",
			outline: "none",
			transition: "border-color 0.15s",
		},
	},
	label: {
		display: "block",
		fontSize: "0.875rem",
		fontWeight: 500,
		marginBottom: "0.25rem",
		color: "var(--form-text, #1f2937)",
	},
	button: {
		primary: {
			backgroundColor: "var(--form-btn-bg, #000)",
			color: "var(--form-btn-text, #fff)",
			borderRadius: "var(--form-radius, 0.375rem)",
			padding: "var(--form-input-padding, 0.5rem 0.75rem)",
			border: "none",
			cursor: "pointer",
			fontWeight: 500,
			transition: "background-color 0.15s, transform 0.1s",
		},
		secondary: {
			backgroundColor: "transparent",
			color: "var(--form-text, #1f2937)",
			borderRadius: "var(--form-radius, 0.375rem)",
			padding: "var(--form-input-padding, 0.5rem 0.75rem)",
			border: "1px solid var(--form-border, #d1d5db)",
			cursor: "pointer",
			fontWeight: 500,
			transition: "background-color 0.15s, transform 0.1s",
		},
	},
	error: {
		color: "var(--form-error, #dc2626)",
		fontSize: "0.75rem",
		marginTop: "0.25rem",
	},
	helpText: {
		color: "var(--form-text, #1f2937)",
		opacity: 0.6,
		fontSize: "0.75rem",
		marginTop: "0.25rem",
	},
	fieldWrapper: {
		marginBottom: "var(--form-field-spacing, 1rem)",
	},
	progressBar: {
		track: {
			height: "0.5rem",
			backgroundColor: "var(--form-border, #d1d5db)",
			borderRadius: "var(--form-radius, 0.375rem)",
			overflow: "hidden",
		},
		fill: {
			height: "100%",
			backgroundColor: "var(--form-primary, #000)",
			borderRadius: "var(--form-radius, 0.375rem)",
			transition: "width 0.3s ease",
		},
	},
};

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

	const fieldStyle = schema.fieldStyle || "outline";
	const layout = schema.layout || "single";
	const inputStyle = themedStyles.input[fieldStyle];

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

	// Layout class based on schema setting
	const layoutClass = layout === "two-column" 
		? "grid grid-cols-1 md:grid-cols-2 gap-4" 
		: layout === "card"
		? "space-y-4"
		: "space-y-3";

	const renderField = (field: Field) => {
		const wrapperStyle = layout === "card" 
			? {
					...themedStyles.fieldWrapper,
					padding: "1rem",
					backgroundColor: "var(--form-bg, #fff)",
					border: "1px solid var(--form-border, #d1d5db)",
					borderRadius: "var(--form-radius, 0.375rem)",
				}
			: themedStyles.fieldWrapper;

		return (
			<div key={field.key} style={wrapperStyle}>
				<label htmlFor={field.key} style={themedStyles.label}>
					{field.label}
					{field.required && <span style={{ color: "var(--form-error, #dc2626)" }}> *</span>}
				</label>
				
				{field.type === "text" && (
					<input 
						id={field.key}
						type="text"
						style={inputStyle}
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
						style={inputStyle}
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
						style={inputStyle}
						value={values[field.key] ?? ""} 
						onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
						aria-invalid={!!errors[field.key]}
						aria-describedby={errors[field.key] ? `${field.key}-error` : field.helpText ? `${field.key}-help` : undefined}
					/>
				)}
				
				{field.type === "boolean" && (
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<input 
							type="checkbox" 
							id={field.key}
							style={{ 
								width: "1.25rem", 
								height: "1.25rem",
								accentColor: "var(--form-primary, #000)",
							}} 
							checked={!!values[field.key]} 
							onChange={(e) => onChange(field.key, e.target.checked)} 
						/>
						{field.helpText && (
							<span style={{ ...themedStyles.helpText, marginTop: 0 }}>{field.helpText}</span>
						)}
					</div>
				)}
				
				{field.type === "textarea" && (
					<textarea 
						id={field.key}
						style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
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
						style={inputStyle}
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
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{field.options?.map((o) => (
							<label key={o.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
								<input 
									type="radio" 
									name={field.key} 
									value={o.value} 
									checked={values[field.key] === o.value} 
									onChange={(e) => onChange(field.key, e.target.value)}
									style={{ accentColor: "var(--form-primary, #000)" }}
								/>
								<span style={{ color: "var(--form-text, #1f2937)" }}>{o.label}</span>
							</label>
						))}
					</div>
				)}
				
				{field.type === "checkboxGroup" && (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
						{field.options?.map((o) => {
							const selected: string[] = values[field.key] ?? [];
							const checked = selected.includes(o.value);
							return (
								<label key={o.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
									<input 
										type="checkbox" 
										checked={checked} 
										onChange={(e) => {
											const next = new Set(selected);
											if (e.target.checked) next.add(o.value); else next.delete(o.value);
											onChange(field.key, Array.from(next));
										}}
										style={{ 
											width: "1rem", 
											height: "1rem",
											accentColor: "var(--form-primary, #000)",
										}}
									/>
									<span style={{ color: "var(--form-text, #1f2937)" }}>{o.label}</span>
								</label>
							);
						})}
					</div>
				)}
				
				{field.type === "date" && (
					<input 
						type="date" 
						id={field.key}
						style={inputStyle}
						value={values[field.key] ?? ""} 
						onChange={(e) => onChange(field.key, e.target.value)} 
					/>
				)}
				
				{errors[field.key] && (
					<p 
						style={themedStyles.error}
						role="alert"
						aria-live="polite"
						id={`${field.key}-error`}
					>
						{errors[field.key]}
					</p>
				)}
				
				{field.helpText && field.type !== "boolean" && (
					<p style={themedStyles.helpText} id={`${field.key}-help`}>
						{field.helpText}
					</p>
				)}
			</div>
		);
	};

	return (
		<div style={{ fontFamily: "var(--form-font, system-ui)", color: "var(--form-text, #1f2937)" }}>
			{usingSteps && visibleSteps.length > 0 && (
				<div style={{ marginBottom: "1.5rem" }}>
					<div style={{ 
						display: "flex", 
						justifyContent: "space-between", 
						fontSize: "0.875rem",
						marginBottom: "0.5rem",
						color: "var(--form-text, #1f2937)",
						opacity: 0.7,
					}}>
						<span>Step {Math.min(activeStepIdx + 1, visibleSteps.length)} of {visibleSteps.length}</span>
						<span>{progressPct}%</span>
					</div>
					<div style={themedStyles.progressBar.track}>
						<div style={{ ...themedStyles.progressBar.fill, width: `${progressPct}%` }} />
					</div>
					{visibleSteps[activeStepIdx]?.title && (
						<h3 style={{ 
							marginTop: "1rem", 
							fontSize: "var(--form-heading-size, 1.25rem)",
							fontWeight: 600,
						}}>
							{visibleSteps[activeStepIdx].title}
						</h3>
					)}
				</div>
			)}
			
			<form onSubmit={onSubmit}>
				<div className={layoutClass}>
					{currentFields.map(renderField)}
				</div>
				
				{usingSteps ? (
					<div style={{ 
						display: "flex", 
						justifyContent: "space-between", 
						marginTop: "1.5rem",
						paddingTop: "1rem",
						borderTop: "1px solid var(--form-border, #d1d5db)",
					}}>
						<button 
							type="button" 
							style={{
								...themedStyles.button.secondary,
								opacity: activeStepIdx === 0 ? 0.5 : 1,
							}}
							onClick={prevStep} 
							disabled={activeStepIdx === 0}
						>
							Back
						</button>
						{activeStepIdx < visibleSteps.length - 1 ? (
							<button 
								type="button" 
								style={themedStyles.button.primary}
								onClick={nextStep}
							>
								Next
							</button>
						) : (
							<button type="submit" style={themedStyles.button.primary}>
								Submit
							</button>
						)}
					</div>
				) : (
					<div style={{ marginTop: "1.5rem" }}>
						<button type="submit" style={themedStyles.button.primary}>
							{mode === "preview" ? "Preview Submit" : "Submit"}
						</button>
					</div>
				)}
			</form>
			
			{submitMsg && (
				<pre style={{ 
					marginTop: "1rem", 
					padding: "1rem",
					backgroundColor: "var(--form-border, #f3f4f6)",
					borderRadius: "var(--form-radius, 0.375rem)",
					fontSize: "0.75rem",
					overflow: "auto",
				}}>
					{submitMsg}
				</pre>
			)}
		</div>
	);
}
