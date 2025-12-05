"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function NewVersionPage() {
	const router = useRouter();
	const params = useParams();
	const formId = params.id as string;

	const [schema, setSchema] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formName, setFormName] = useState("");
	const [currentVersion, setCurrentVersion] = useState(0);

	// Load current form data
	useEffect(() => {
		async function loadForm() {
			try {
				const res = await fetch(`/api/admin/forms/${formId}`);
				if (!res.ok) throw new Error("Failed to load form");
				const data = await res.json();
				setFormName(data.name);
				
				// Get the latest version's schema as starting point
				if (data.versions && data.versions.length > 0) {
					const latest = data.versions.reduce((a: any, b: any) => 
						a.versionNumber > b.versionNumber ? a : b
					);
					setCurrentVersion(latest.versionNumber);
					if (latest.schema) {
						setSchema(JSON.stringify(latest.schema, null, 2));
					}
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load form");
			} finally {
				setLoading(false);
			}
		}
		loadForm();
	}, [formId]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setError(null);

		try {
			// Validate JSON
			let parsedSchema;
			try {
				parsedSchema = JSON.parse(schema);
			} catch {
				throw new Error("Invalid JSON schema");
			}

			const res = await fetch(`/api/admin/forms/${formId}/versions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ schema: parsedSchema }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to create version");
			}

			router.push(`/admin/forms/${formId}`);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create version");
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">New Version</h1>
					<p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
						Creating version {currentVersion + 1} for &quot;{formName}&quot;
					</p>
				</div>
				<Link 
					href={`/admin/forms/${formId}`} 
					className="text-sm" 
					style={{ color: '#818cf8' }}
				>
					← Back to form
				</Link>
			</div>

			<form onSubmit={handleSubmit}>
				<div className="rounded-xl p-6" style={cardStyle}>
					<div className="mb-4">
						<label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
							Form Schema (JSON)
						</label>
						<textarea
							value={schema}
							onChange={(e) => setSchema(e.target.value)}
							rows={20}
							className="w-full rounded-lg p-4 font-mono text-sm focus:outline-none focus:ring-2"
							style={{ 
								background: '#0f172a', 
								border: '1px solid #334155', 
								color: '#e2e8f0'
							}}
							placeholder='{"title": "My Form", "fields": [...]}'
						/>
						<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
							Edit the JSON schema to define your form fields. The schema from the current version is pre-loaded.
						</p>
					</div>

					{error && (
						<div 
							className="mb-4 rounded-lg p-3 text-sm"
							style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
						>
							{error}
						</div>
					)}

					<div className="flex items-center gap-3">
						<button
							type="submit"
							disabled={saving || !schema.trim()}
							className="rounded-full px-6 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
							style={{ 
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
							}}
						>
							{saving ? "Creating..." : "Create Version"}
						</button>
						<Link
							href={`/admin/forms/${formId}`}
							className="rounded-full px-6 py-2.5 text-sm font-medium transition-all active:scale-[0.98] active:bg-[rgba(255,255,255,0.05)]"
							style={{ border: '1px solid #334155', color: '#94a3b8' }}
						>
							Cancel
						</Link>
					</div>
				</div>
			</form>

			<div className="mt-6 rounded-xl p-5" style={cardStyle}>
				<h2 className="text-sm font-medium mb-3" style={{ color: '#94a3b8' }}>Schema Tips</h2>
				<ul className="space-y-2 text-xs" style={{ color: '#64748b' }}>
					<li>• Each field needs a <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>name</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>type</code>, and <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>label</code></li>
					<li>• Supported types: <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>text</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>email</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>textarea</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>select</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>checkbox</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>number</code>, <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>date</code></li>
					<li>• Add <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>required: true</code> to make a field mandatory</li>
					<li>• For select fields, include an <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: '#818cf8' }}>options</code> array</li>
				</ul>
			</div>
		</div>
	);
}

