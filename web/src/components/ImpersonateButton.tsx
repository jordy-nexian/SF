"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

interface ImpersonateButtonProps {
	userId: string;
	userEmail: string;
	tenantName: string;
}

export default function ImpersonateButton({ userId, userEmail, tenantName }: ImpersonateButtonProps) {
	const { data: session, update } = useSession();
	const router = useRouter();
	const [impersonating, setImpersonating] = useState(false);
	const [error, setError] = useState("");

	async function handleImpersonate() {
		if (!confirm(`Impersonate ${userEmail} from ${tenantName}?`)) return;

		setImpersonating(true);
		setError("");

		try {
			// Get signed impersonation token from API (platform admin verified server-side)
			const res = await fetch("/api/platform/impersonate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to start impersonation");
			}

			// Update NextAuth session with the signed impersonation token
			// The JWT callback will verify the token before applying session changes
			await update({
				impersonationToken: data.impersonationToken,
			});

			// Redirect to admin dashboard
			router.push("/admin");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to impersonate");
			console.error("Impersonation error:", err);
		} finally {
			setImpersonating(false);
		}
	}

	return (
		<div>
			<button
				onClick={handleImpersonate}
				disabled={impersonating}
				className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 active:scale-95 active:opacity-80"
				style={{
					background: 'rgba(139, 92, 246, 0.2)',
					border: '1px solid rgba(139, 92, 246, 0.3)',
					color: '#a78bfa'
				}}
			>
				{impersonating ? "Starting..." : "👁️ View as Tenant"}
			</button>
			{error && (
				<p className="mt-2 text-xs" style={{ color: '#f87171' }}>{error}</p>
			)}
		</div>
	);
}

