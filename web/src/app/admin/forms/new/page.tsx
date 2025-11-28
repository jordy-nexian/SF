"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import FormRenderer, { FormSchema } from "@/components/FormRenderer";

const starterSchema: FormSchema = {
	id: "new-form",
	version: 1,
	title: "Untitled form",
	description: "Describe your form...",
	fields: [
		{ key: "email", type: "email", label: "Email", required: true },
		{ key: "message", type: "textarea", label: "Message" },
	],
	steps: [],
};

export default function NewFormPage() {
	const router = useRouter();
	const [name, setName] = useState("New form");
	const [publicId, setPublicId] = useState("");
	const [schemaText, setSchemaText] = useState(JSON.stringify(starterSchema, null, 2));
	const [error, setError] = useState<string | null>(null);
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
			if (!res.ok) {
				const j = await res.json().catch(() => ({}));
				throw new Error(j?.error || "Failed to create form");
			}
			router.push("/admin");
			router.refresh();
		} catch (err: any) {
			setError(err?.message || "Failed to create form");
		}
	}

	return (
		<div className="mx-auto max-w-6xl">
			<h1 className="mb-4 text-xl font-semibold">Create form</h1>
			<form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div className="space-y-3">
					<div>
						<label className="mb-1 block text-sm">Name</label>
						<input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
					</div>
					<div>
						<label className="mb-1 block text-sm">Public ID (slug)</label>
						<input className="w-full rounded border px-3 py-2" value={publicId} onChange={(e) => setPublicId(e.target.value)} placeholder="contact" required />
						<p className="text-xs text-gray-500">Public URL will be /f/{publicId || "…"}</p>
					</div>
					<div>
						<label className="mb-1 block text-sm">Schema (JSON)</label>
						<textarea className="h-[380px] w-full rounded border p-2 font-mono text-xs" value={schemaText} onChange={(e) => setSchemaText(e.target.value)} />
					</div>
					<div className="flex items-center gap-3">
						<button type="submit" className="rounded bg-black px-4 py-2 text-white">Create form</button>
						{error && <p className="text-sm text-red-600">{error}</p>}
					</div>
				</div>
				<div className="rounded border bg-white p-4">
					<h2 className="mb-3 text-sm font-medium text-gray-700">Live preview</h2>
					{parsedSchema ? (
						<FormRenderer schema={parsedSchema} />
					) : (
						<p className="text-sm text-red-600">Invalid JSON</p>
					)}
				</div>
			</form>
		</div>
	);
}



