"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StatusUpdateForm({ 
	formId, 
	currentStatus 
}: { 
	formId: string; 
	currentStatus: string;
}) {
	const router = useRouter();
	const [status, setStatus] = useState(currentStatus);
	const [updating, setUpdating] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setUpdating(true);

		try {
			const res = await fetch(`/api/admin/forms/${formId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status }),
			});

			if (!res.ok) {
				throw new Error("Failed to update status");
			}

			router.refresh();
		} catch (err) {
			console.error("Failed to update status:", err);
		} finally {
			setUpdating(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} className="flex items-center gap-3">
			<select
				name="status"
				value={status}
				onChange={(e) => setStatus(e.target.value)}
				className="rounded-lg px-3 py-2 text-sm focus:outline-none"
				style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
			>
				<option value="draft">Draft</option>
				<option value="live">Live</option>
				<option value="archived">Archived</option>
			</select>
			<button
				type="submit"
				disabled={updating || status === currentStatus}
				className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
				style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
			>
				{updating ? "Updating..." : "Update"}
			</button>
		</form>
	);
}












