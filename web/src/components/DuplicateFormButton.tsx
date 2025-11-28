"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
				className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
			>
				Duplicate
			</button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h2 className="mb-4 text-lg font-semibold">Duplicate Form</h2>
				<form onSubmit={onDuplicate} className="space-y-4">
					<div>
						<label className="mb-1 block text-sm font-medium">New Form Name</label>
						<input
							type="text"
							className="w-full rounded border px-3 py-2"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<label className="mb-1 block text-sm font-medium">New Public ID (slug)</label>
						<input
							type="text"
							className="w-full rounded border px-3 py-2"
							value={publicId}
							onChange={(e) => setPublicId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
							placeholder="my-form-copy"
							required
						/>
						<p className="mt-1 text-xs text-gray-500">
							URL will be /f/{publicId || "..."}
						</p>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded border px-4 py-2 text-sm"
							disabled={loading}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
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

