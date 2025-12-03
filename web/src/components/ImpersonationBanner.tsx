"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ImpersonationBanner() {
	const { data: session, update } = useSession();
	const router = useRouter();
	const [exiting, setExiting] = useState(false);

	const impersonating = (session as any)?.impersonating;

	if (!impersonating?.isImpersonating) {
		return null;
	}

	async function handleExit() {
		if (!confirm("Exit impersonation and return to platform admin?")) return;
		
		setExiting(true);
		try {
			// Clear impersonation from session
			await update({
				impersonate: null,
			});
			// Wait a moment for session to update
			await new Promise(resolve => setTimeout(resolve, 500));
			// Redirect to platform admin
			router.push("/platform");
			router.refresh();
		} catch (err) {
			console.error("Failed to exit impersonation:", err);
			alert("Failed to exit impersonation. Please refresh the page.");
		} finally {
			setExiting(false);
		}
	}

	return (
		<>
			<div 
				className="fixed top-0 left-0 right-0 z-50 p-3 text-center"
				style={{ 
					background: 'linear-gradient(to right, #f59e0b, #ef4444)',
					color: 'white',
					boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
				}}
			>
				<div className="flex items-center justify-center gap-4">
					<span className="font-semibold">
						⚠️ IMPERSONATION MODE: Viewing as {session?.user?.email}
					</span>
					<button
						onClick={handleExit}
						disabled={exiting}
						className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
						style={{ 
							background: 'rgba(255,255,255,0.2)',
							border: '1px solid rgba(255,255,255,0.3)',
						}}
					>
						{exiting ? "Exiting..." : "Exit Impersonation"}
					</button>
				</div>
			</div>
			{/* Spacer to prevent content from being hidden under banner */}
			<div style={{ height: '60px' }} />
		</>
	);
}

