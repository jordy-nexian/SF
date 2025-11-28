"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type FormSettings = {
	id: string;
	name: string;
	publicId: string;
	status: string;
	primaryN8nWebhookUrl: string | null;
	thankYouUrl: string | null;
	thankYouMessage: string | null;
};

export default function FormSettingsPage() {
	const router = useRouter();
	const params = useParams();
	const formId = params.id as string;

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [name, setName] = useState("");
	const [webhookUrl, setWebhookUrl] = useState("");
	const [thankYouUrl, setThankYouUrl] = useState("");
	const [thankYouMessage, setThankYouMessage] = useState("");

	useEffect(() => {
		fetch(`/api/admin/forms/${formId}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					setName(data.name || "");
					setWebhookUrl(data.primaryN8nWebhookUrl || "");
					setThankYouUrl(data.thankYouUrl || "");
					setThankYouMessage(data.thankYouMessage || "");
				}
			})
			.finally(() => setLoading(false));
	}, [formId]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		setSaving(true);

		try {
			const res = await fetch(`/api/admin/forms/${formId}`, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name,
					primaryN8nWebhookUrl: webhookUrl || null,
					thankYouUrl: thankYouUrl || null,
					thankYouMessage: thankYouMessage || null,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to save settings");
			}

			setSuccess("Settings saved successfully");
			router.refresh();
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return <div className="p-6">Loading...</div>;
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-xl font-semibold">Form Settings</h1>
				<Link href={`/admin/forms/${formId}`} className="text-sm text-blue-600">
					← Back to form
				</Link>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Basic Settings */}
				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 font-medium">Basic Settings</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium">Form Name</label>
							<input
								type="text"
								className="w-full rounded border px-3 py-2"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
					</div>
				</div>

				{/* Webhook Settings */}
				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 font-medium">Webhook Settings</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium">
								n8n Webhook URL
							</label>
							<input
								type="url"
								className="w-full rounded border px-3 py-2 font-mono text-sm"
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								placeholder="https://your-n8n.com/webhook/..."
							/>
							<p className="mt-1 text-xs text-gray-500">
								Leave empty to use tenant default webhook. HTTPS required in production.
							</p>
						</div>
					</div>
				</div>

				{/* Thank You Settings */}
				<div className="rounded-lg border bg-white p-6">
					<h2 className="mb-4 font-medium">After Submission</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1 block text-sm font-medium">
								Redirect URL (optional)
							</label>
							<input
								type="url"
								className="w-full rounded border px-3 py-2"
								value={thankYouUrl}
								onChange={(e) => setThankYouUrl(e.target.value)}
								placeholder="https://example.com/thank-you"
							/>
							<p className="mt-1 text-xs text-gray-500">
								Redirect users to this URL after successful submission.
							</p>
						</div>
						<div>
							<label className="mb-1 block text-sm font-medium">
								Thank You Message
							</label>
							<textarea
								className="w-full rounded border px-3 py-2"
								rows={3}
								value={thankYouMessage}
								onChange={(e) => setThankYouMessage(e.target.value)}
								placeholder="Thanks for your submission! We'll be in touch soon."
							/>
							<p className="mt-1 text-xs text-gray-500">
								Shown if no redirect URL is set.
							</p>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-4">
					<button
						type="submit"
						disabled={saving}
						className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Settings"}
					</button>
					{error && <p className="text-sm text-red-600">{error}</p>}
					{success && <p className="text-sm text-green-600">{success}</p>}
				</div>
			</form>
		</div>
	);
}

