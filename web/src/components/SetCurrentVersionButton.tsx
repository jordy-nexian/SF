"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetCurrentVersionButton({ 
	formId, 
	versionId 
}: { 
	formId: string; 
	versionId: string;
}) {
	const router = useRouter();
	const [updating, setUpdating] = useState(false);

	async function handleClick() {
		setUpdating(true);

		try {
			const res = await fetch(`/api/admin/forms/${formId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ currentVersionId: versionId }),
			});

			if (!res.ok) {
				throw new Error("Failed to set current version");
			}

			router.refresh();
		} catch (err) {
			console.error("Failed to set current version:", err);
		} finally {
			setUpdating(false);
		}
	}

	return (
		<button 
			type="button"
			onClick={handleClick}
			disabled={updating}
			className="rounded-full px-3 py-1 text-xs transition-all disabled:opacity-50"
			style={{ border: '1px solid #334155', color: '#94a3b8' }}
		>
			{updating ? "Setting..." : "Set current"}
		</button>
	);
}





