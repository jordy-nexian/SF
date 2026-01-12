"use client";

import type { Field } from "@/types/form-schema";

type FieldProps = {
	field: Field;
	value: unknown;
	onChange: (key: string, value: unknown) => void;
	error?: string;
};

export function TextField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<input
				type="text"
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
					borderRadius: "var(--form-radius, 0.375rem)",
					padding: "var(--form-input-padding, 0.5rem 0.75rem)",
				}}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(field.key, e.target.value)}
			/>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function EmailField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<input
				type="email"
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
				}}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(field.key, e.target.value)}
			/>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function NumberField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<input
				type="number"
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
				}}
				value={(value as number) ?? ""}
				onChange={(e) => onChange(field.key, e.target.valueAsNumber)}
			/>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function TextareaField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<textarea
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
				}}
				rows={4}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(field.key, e.target.value)}
			/>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function BooleanField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="flex items-center gap-2 text-sm font-medium">
				<input
					type="checkbox"
					className="h-4 w-4"
					checked={!!value}
					onChange={(e) => onChange(field.key, e.target.checked)}
				/>
				{field.label}
				{field.required && " *"}
			</label>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function SelectField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<select
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
				}}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(field.key, e.target.value)}
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
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function RadioField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<div className="space-y-1">
				{field.options?.map((opt) => (
					<label key={opt.value} className="flex items-center gap-2">
						<input
							type="radio"
							name={field.key}
							value={opt.value}
							checked={value === opt.value}
							onChange={(e) => onChange(field.key, e.target.value)}
						/>
						<span>{opt.label}</span>
					</label>
				))}
			</div>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function CheckboxGroupField({ field, value, onChange, error }: FieldProps) {
	const selected: string[] = Array.isArray(value) ? value : [];

	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<div className="space-y-1">
				{field.options?.map((opt) => {
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
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

export function DateField({ field, value, onChange, error }: FieldProps) {
	return (
		<div className="space-y-1">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			<input
				type="date"
				className="w-full rounded border px-3 py-2"
				style={{
					borderColor: error ? "var(--form-error, #dc2626)" : "var(--form-border, #d1d5db)",
				}}
				value={(value as string) ?? ""}
				onChange={(e) => onChange(field.key, e.target.value)}
			/>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}

type RepeatableFieldProps = FieldProps & {
	errors: Record<string, string>;
};

export function RepeatableField({ field, value, onChange, errors }: RepeatableFieldProps) {
	const items = Array.isArray(value) ? value : [];

	function addItem() {
		onChange(field.key, [...items, {}]);
	}

	function removeItem(index: number) {
		const next = [...items];
		next.splice(index, 1);
		onChange(field.key, next);
	}

	function updateItem(index: number, subKey: string, subValue: unknown) {
		const next = [...items];
		next[index] = { ...(next[index] ?? {}), [subKey]: subValue };
		onChange(field.key, next);
	}

	return (
		<div className="space-y-2">
			<label className="block text-sm font-medium">
				{field.label}
				{field.required && " *"}
			</label>
			{items.map((item, idx) => (
				<div key={idx} className="rounded border p-3">
					<div className="flex items-center justify-between">
						<div className="text-sm font-medium">Item {idx + 1}</div>
						<button
							type="button"
							className="text-sm text-red-600"
							onClick={() => removeItem(idx)}
						>
							Remove
						</button>
					</div>
					<div className="mt-2 grid gap-3">
						{(field.itemFields ?? []).map((sub) => {
							const errorKey = `${field.key}[${idx}].${sub.key}`;
							return (
								<FormField
									key={sub.key}
									field={sub}
									value={(item as Record<string, unknown>)?.[sub.key]}
									onChange={(_k, v) => updateItem(idx, sub.key, v)}
									error={errors[errorKey]}
									errors={errors}
								/>
							);
						})}
					</div>
				</div>
			))}
			<button
				type="button"
				className="rounded border px-3 py-1 text-sm"
				onClick={addItem}
			>
				Add item
			</button>
			{field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
		</div>
	);
}

type FormFieldProps = {
	field: Field;
	value: unknown;
	onChange: (key: string, value: unknown) => void;
	error?: string;
	errors: Record<string, string>;
};

export function FormField({ field, value, onChange, error, errors }: FormFieldProps) {
	switch (field.type) {
		case "text":
			return <TextField field={field} value={value} onChange={onChange} error={error} />;
		case "email":
			return <EmailField field={field} value={value} onChange={onChange} error={error} />;
		case "number":
			return <NumberField field={field} value={value} onChange={onChange} error={error} />;
		case "textarea":
			return <TextareaField field={field} value={value} onChange={onChange} error={error} />;
		case "boolean":
			return <BooleanField field={field} value={value} onChange={onChange} error={error} />;
		case "select":
			return <SelectField field={field} value={value} onChange={onChange} error={error} />;
		case "radio":
			return <RadioField field={field} value={value} onChange={onChange} error={error} />;
		case "checkboxGroup":
			return <CheckboxGroupField field={field} value={value} onChange={onChange} error={error} />;
		case "date":
			return <DateField field={field} value={value} onChange={onChange} error={error} />;
		case "repeatable":
			return <RepeatableField field={field} value={value} onChange={onChange} errors={errors} />;
		default:
			return null;
	}
}












