"use client";

import { useEffect, useMemo, useState } from "react";

type FieldType =
	| "text"
	| "textarea"
	| "email"
	| "number"
	| "boolean";

type ValidationRule = {
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	min?: number;
	max?: number;
	required?: boolean;
};

type Field = {
	key: string;
	type: FieldType;
	label: string;
	helpText?: string;
	required?: boolean;
	validation?: ValidationRule;
};

type FormSchema = {
	id: string;
	version: number;
	title: string;
	description?: string;
	steps?: { id: string; title: string; fields: string[] }[];
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

	const orderedFields = useMemo(() => {
		if (!schema) return [];
		if (schema.steps && schema.steps.length > 0) {
			const fieldKeys = schema.steps.flatMap((s) => s.fields);
			return fieldKeys
				.map((k) => schema.fields.find((f) => f.key === k))
				.filter(Boolean) as Field[];
		}
		return schema.fields;
	}, [schema]);

	function onChange(key: string, value: any) {
		setValues((prev) => ({ ...prev, [key]: value }));
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitOk(null);
		setSubmitError(null);
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

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="text-2xl font-semibold">{schema.title}</h1>
			{schema.description && (
				<p className="mt-2 text-gray-600">{schema.description}</p>
			)}
			<form className="mt-6 space-y-4" onSubmit={onSubmit}>
				{orderedFields.map((field) => (
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
						{field.helpText && (
							<p className="text-xs text-gray-500">{field.helpText}</p>
						)}
					</div>
				))}
				<div className="pt-2">
					<button
						type="submit"
						className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800"
					>
						Submit
					</button>
				</div>
				{submitOk && <p className="text-green-600">{submitOk}</p>}
				{submitError && <p className="text-red-600">{submitError}</p>}
			</form>
		</div>
	);
}


