"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import FormRenderer from "@/components/FormRenderer";
import type { FormSchema } from "@/types/form-schema";
import { getTemplateById } from "@/lib/form-templates";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

const starterSchema: FormSchema = {
	id: "new-form",
	version: 1,
	title: "Untitled template",
	description: "Describe your form...",
	fields: [
		{ key: "email", type: "email", label: "Email", required: true },
		{ key: "message", type: "textarea", label: "Message" },
	],
	steps: [],
};

function NewFormContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const templateId = searchParams.get("template");

	const [name, setName] = useState("New template");
	const [publicId, setPublicId] = useState("");
	const [schemaText, setSchemaText] = useState(JSON.stringify(starterSchema, null, 2));
	const [error, setError] = useState<string | null>(null);
	const [templateName, setTemplateName] = useState<string | null>(null);

	useEffect(() => {
		if (templateId) {
			const template = getTemplateById(templateId);
			if (template) {
				setName(template.name);
				setPublicId(template.id);
				setSchemaText(JSON.stringify(template.schema, null, 2));
				setTemplateName(template.name);
			}
		}
	}, [templateId]);

	const parsedSchema = useMemo(() => {
		try {
			return JSON.parse(schemaText) as FormSchema;
		} catch {
			return null;
		}
	}, [schemaText]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		if (!parsedSchema) {
			setError("Schema JSON is invalid.");
			return;
		}
		try {
			const res = await fetch("/api/admin/forms", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, publicId, schema: parsedSchema }),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				// Handle standardized error response
				const errorMsg = json.error?.message || json.error || "Failed to create form";
				throw new Error(errorMsg);
			}
			// Handle standardized success response: { success: true, data: { formId: "..." } }
			const responseData = json.data ?? json;
			const formId = responseData.formId || responseData.id;
			router.push(`/admin/forms/${formId}`);
			router.refresh();
		} catch (err: any) {
			setError(err?.message || "Failed to create form");
		}
	}

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">
						{templateName ? `Create from: ${templateName}` : "Advanced: JSON Editor"}
					</h1>
					{!templateId && (
						<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
							For direct schema control.{" "}
							<Link href="/admin/forms/builder" style={{ color: '#818cf8' }}>
								Use the visual builder →
							</Link>
						</p>
					)}
				</div>
				{templateId && (
					<Link href="/admin/forms/new/templates" className="text-sm" style={{ color: '#818cf8' }}>
						← Choose different template
					</Link>
				)}
			</div>

			<form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div className="space-y-4">
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Name</label>
						<input
							className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
							style={inputStyle}
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Public ID (slug)</label>
						<input
							className="w-full rounded-lg px-3 py-2.5 font-mono focus:outline-none"
							style={inputStyle}
							value={publicId}
							onChange={(e) => setPublicId(e.target.value)}
							placeholder="contact"
							required
						/>
						<p className="mt-1 text-xs" style={{ color: '#64748b' }}>Public URL will be /f/{publicId || "…"}</p>
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Schema (JSON)</label>
						<textarea
							className="h-[380px] w-full rounded-lg p-3 font-mono text-xs focus:outline-none"
							style={inputStyle}
							value={schemaText}
							onChange={(e) => setSchemaText(e.target.value)}
						/>
					</div>
					<div className="flex items-center gap-4">
						<button
							type="submit"
							className="rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
							style={{
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
							}}
						>
							Create template
						</button>
						<Link href="/admin" className="text-sm" style={{ color: '#94a3b8' }}>Cancel</Link>
						{error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
					</div>
				</div>

				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 text-sm font-medium" style={{ color: '#94a3b8' }}>Live preview</h2>
					{parsedSchema ? (
						<FormRenderer schema={parsedSchema} />
					) : (
						<p className="text-sm" style={{ color: '#f87171' }}>Invalid JSON</p>
					)}
				</div>
			</form>
		</div>
	);
}

export default function NewFormPage() {
	return (
		<Suspense fallback={
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		}>
			<NewFormContent />
		</Suspense>
	);
}
