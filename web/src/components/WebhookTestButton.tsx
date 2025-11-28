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
		<div className="space-y-2">
			<button
				type="button"
				onClick={runTest}
				disabled={loading}
				className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{loading ? "Testing…" : "Test Webhook"}
			</button>
			{result && (
				<div
					className={`rounded p-3 text-sm ${
						result.success
							? "bg-green-50 text-green-800"
							: "bg-red-50 text-red-800"
					}`}
				>
					{result.success ? (
						<>
							<div className="font-medium">✓ Webhook responded successfully</div>
							<div className="mt-1 text-xs">
								Status: {result.status} {result.statusText} • {result.durationMs}ms
							</div>
							{result.response && (
								<pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-white/50 p-2 text-xs">
									{result.response}
								</pre>
							)}
						</>
					) : (
						<>
							<div className="font-medium">✗ Webhook test failed</div>
							<div className="mt-1 text-xs">
								{result.error ||
									`Status: ${result.status} ${result.statusText}`}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

