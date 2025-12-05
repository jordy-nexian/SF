"use client";

import { useState } from "react";

type TestResult = {
	success: boolean;
	status?: number;
	statusText?: string;
	durationMs?: number;
	response?: string;
	error?: string;
};

export default function WebhookTestButton({ formId }: { formId: string }) {
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<TestResult | null>(null);

	async function runTest() {
		setLoading(true);
		setResult(null);
		try {
			const res = await fetch(`/api/admin/forms/${formId}/test-webhook`, {
				method: "POST",
			});
			const data = await res.json();
			setResult(data);
		} catch (err) {
			setResult({
				success: false,
				error: err instanceof Error ? err.message : "Test failed",
			});
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="space-y-3">
			<button
				type="button"
				onClick={runTest}
				disabled={loading}
				className="rounded-full px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 active:scale-[0.98] active:shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
				style={{
					background: 'linear-gradient(to right, #3b82f6, #6366f1)',
					color: 'white',
				}}
			>
				{loading ? "Testing…" : "Test Webhook"}
			</button>
			{result && (
				<div
					className="rounded-lg p-4 text-sm"
					style={{
						background: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)',
						border: `1px solid ${result.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
						color: result.success ? '#10b981' : '#f87171',
					}}
				>
					{result.success ? (
						<>
							<div className="font-medium">✓ Webhook responded successfully</div>
							<div className="mt-1 text-xs opacity-80">
								Status: {result.status} {result.statusText} • {result.durationMs}ms
							</div>
							{result.response && (
								<pre 
									className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg p-2 text-xs"
									style={{ background: 'rgba(255, 255, 255, 0.05)' }}
								>
									{result.response}
								</pre>
							)}
						</>
					) : (
						<>
							<div className="font-medium">✗ Webhook test failed</div>
							<div className="mt-1 text-xs opacity-80">
								{result.error || `Status: ${result.status} ${result.statusText}`}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
