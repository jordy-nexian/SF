"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteFormButton({
	formId,
	formName,
}: {
	formId: string;
	formName: string;
}) {
	const router = useRouter();
	const [showConfirm, setShowConfirm] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		setDeleting(true);
		setError(null);

		try {
			const res = await fetch(`/api/admin/forms/${formId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to delete form");
			}

			setShowConfirm(false);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete");
		} finally {
			setDeleting(false);
		}
	}

	if (!showConfirm) {
		return (
			<button
				onClick={() => setShowConfirm(true)}
				className="p-1.5 rounded-lg transition-all hover:bg-white/10 opacity-50 hover:opacity-100 active:scale-90 active:bg-red-500/10"
				style={{ color: '#f87171' }}
				title="Delete template"
				aria-label={`Delete ${formName}`}
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
				</svg>
			</button>
		);
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: 'rgba(0, 0, 0, 0.7)' }}
			onClick={() => !deleting && setShowConfirm(false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-dialog-title"
		>
			<div
				className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
				style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)' }}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 id="delete-dialog-title" className="mb-2 text-lg font-semibold text-white">Delete Template</h2>
				<p className="mb-4 text-sm" style={{ color: '#94a3b8' }}>
					Are you sure you want to delete <strong className="text-white">{formName}</strong>?
					This action cannot be undone.
				</p>

				{error && (
					<p className="mb-4 text-sm" style={{ color: '#f87171' }}>{error}</p>
				)}

				<div className="flex justify-end gap-3">
					<button
						onClick={() => setShowConfirm(false)}
						disabled={deleting}
						className="rounded-full px-4 py-2 text-sm transition-all active:scale-[0.98] active:bg-[rgba(255,255,255,0.05)]"
						style={{ border: '1px solid #334155', color: '#cbd5e1' }}
					>
						Cancel
					</button>
					<button
						onClick={handleDelete}
						disabled={deleting}
						className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-all active:scale-[0.98] active:bg-[#b91c1c]"
						style={{ background: '#dc2626' }}
					>
						{deleting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}

