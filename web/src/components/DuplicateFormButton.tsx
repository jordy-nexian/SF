"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

export default function DuplicateFormButton({
	formId,
	formName,
}: {
	formId: string;
	formName: string;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState(`${formName} (Copy)`);
	const [publicId, setPublicId] = useState("");

	async function onDuplicate(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await fetch(`/api/admin/forms/${formId}/duplicate`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name, publicId }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to duplicate form");
			}

			router.push(`/admin/forms/${data.id}`);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to duplicate");
		} finally {
			setLoading(false);
		}
	}

	if (!open) {
		return (
			<button
				onClick={() => setOpen(true)}
				className="rounded-full px-4 py-1.5 text-sm transition-all active:scale-[0.98] active:bg-[rgba(255,255,255,0.05)]"
				style={{ border: '1px solid #334155', color: '#cbd5e1' }}
			>
				Duplicate
			</button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
			<div
				className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
				style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)' }}
			>
				<h2 className="mb-5 text-lg font-semibold text-white">Duplicate Template</h2>
				<form onSubmit={onDuplicate} className="space-y-4">
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>New Template Name</label>
						<input
							type="text"
							className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
							style={inputStyle}
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>New Public ID (slug)</label>
						<input
							type="text"
							className="w-full rounded-lg px-3 py-2.5 font-mono focus:outline-none"
							style={inputStyle}
							value={publicId}
							onChange={(e) => setPublicId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
							placeholder="my-form-copy"
							required
						/>
						<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
							URL will be /f/{publicId || "..."}
						</p>
					</div>
					{error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded-full px-4 py-2 text-sm transition-all active:scale-[0.98] active:bg-[rgba(255,255,255,0.05)]"
							style={{ border: '1px solid #334155', color: '#cbd5e1' }}
							disabled={loading}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-all active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
							style={{
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
							}}
							disabled={loading}
						>
							{loading ? "Duplicating..." : "Duplicate"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
