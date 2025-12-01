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
				className="text-sm transition-colors opacity-50 hover:opacity-100"
				style={{ color: '#f87171' }}
				title="Delete form"
			>
				×
			</button>
		);
	}

	return (
		<div 
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ background: 'rgba(0, 0, 0, 0.7)' }}
			onClick={() => !deleting && setShowConfirm(false)}
		>
			<div 
				className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
				style={{ background: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.1)' }}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="mb-2 text-lg font-semibold text-white">Delete Form</h2>
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
						className="rounded-full px-4 py-2 text-sm transition-all"
						style={{ border: '1px solid #334155', color: '#cbd5e1' }}
					>
						Cancel
					</button>
					<button
						onClick={handleDelete}
						disabled={deleting}
						className="rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-all"
						style={{ background: '#dc2626' }}
					>
						{deleting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}

