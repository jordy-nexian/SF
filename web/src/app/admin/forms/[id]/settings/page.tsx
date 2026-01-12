"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { UpgradeBadge } from "@/components/UpgradePrompt";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

const disabledInputStyle = {
	...inputStyle,
	opacity: 0.5,
	cursor: 'not-allowed',
};

interface Features {
	webhookFailover: boolean;
	abTesting: boolean;
}

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
	const [backupWebhookUrl, setBackupWebhookUrl] = useState("");
	const [thankYouUrl, setThankYouUrl] = useState("");
	const [thankYouMessage, setThankYouMessage] = useState("");
	const [features, setFeatures] = useState<Features>({ webhookFailover: false, abTesting: false });

	useEffect(() => {
		Promise.all([
			fetch(`/api/admin/forms/${formId}`).then((r) => (r.ok ? r.json() : null)),
			fetch("/api/admin/billing/usage").then((r) => r.json()),
		])
			.then(([formJson, usageJson]) => {
				// Handle standardized response format: { success: true, data: {...} }
				const formData = formJson?.data ?? formJson;
				const usageData = usageJson?.data ?? usageJson;
				
				if (formData) {
					setName(formData.name || "");
					setWebhookUrl(formData.primaryN8nWebhookUrl || "");
					setBackupWebhookUrl(formData.backupWebhookUrl || "");
					setThankYouUrl(formData.thankYouUrl || "");
					setThankYouMessage(formData.thankYouMessage || "");
				}
				if (usageData?.features) {
					setFeatures({
						webhookFailover: usageData.features.webhookFailover,
						abTesting: usageData.features.abTesting,
					});
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
					backupWebhookUrl: features.webhookFailover ? (backupWebhookUrl || null) : null,
					thankYouUrl: thankYouUrl || null,
					thankYouMessage: thankYouMessage || null,
				}),
			});

			if (!res.ok) {
				const json = await res.json().catch(() => ({}));
				const errorMsg = json.error?.message || json.error || "Failed to save settings";
				throw new Error(errorMsg);
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
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-white">Form Settings</h1>
				<Link href={`/admin/forms/${formId}`} className="text-sm" style={{ color: '#818cf8' }}>
					← Back to form
				</Link>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Basic Settings */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Basic Settings</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Form Name</label>
							<input
								type="text"
								className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
								style={inputStyle}
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
					</div>
				</div>

				{/* Webhook Settings */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Webhook Settings</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
								n8n Webhook URL
							</label>
							<input
								type="url"
								className="w-full rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none"
								style={inputStyle}
								value={webhookUrl}
								onChange={(e) => setWebhookUrl(e.target.value)}
								placeholder="https://your-n8n.com/webhook/..."
							/>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								Leave empty to use tenant default webhook. HTTPS required in production.
							</p>
						</div>

						{/* Backup Webhook - Pro Feature */}
						<div>
							<label className="mb-1.5 flex items-center gap-2 text-sm font-medium" style={{ color: '#94a3b8' }}>
								Backup Webhook URL
								{!features.webhookFailover && <UpgradeBadge plan="Pro" />}
							</label>
							<input
								type="url"
								className="w-full rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none"
								style={features.webhookFailover ? inputStyle : disabledInputStyle}
								value={backupWebhookUrl}
								onChange={(e) => setBackupWebhookUrl(e.target.value)}
								placeholder="https://backup-n8n.com/webhook/..."
								disabled={!features.webhookFailover}
							/>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								{features.webhookFailover 
									? "If the primary webhook fails, we'll automatically retry with this backup URL."
									: "Upgrade to Pro to enable automatic failover to a backup webhook."
								}
							</p>
						</div>
					</div>
				</div>

				{/* Thank You Settings */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">After Submission</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
								Redirect URL (optional)
							</label>
							<input
								type="url"
								className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
								style={inputStyle}
								value={thankYouUrl}
								onChange={(e) => setThankYouUrl(e.target.value)}
								placeholder="https://example.com/thank-you"
							/>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								Redirect users to this URL after successful submission.
							</p>
						</div>
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
								Thank You Message
							</label>
							<textarea
								className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
								style={inputStyle}
								rows={3}
								value={thankYouMessage}
								onChange={(e) => setThankYouMessage(e.target.value)}
								placeholder="Thanks for your submission! We'll be in touch soon."
							/>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								Shown if no redirect URL is set.
							</p>
						</div>
					</div>
				</div>

				{/* A/B Testing - Pro Feature */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-semibold text-white">A/B Testing</h2>
						{!features.abTesting && <UpgradeBadge plan="Pro" />}
					</div>
					{features.abTesting ? (
						<div className="space-y-4">
							<p className="text-sm" style={{ color: '#94a3b8' }}>
								Configure traffic weights for different form versions in the{' '}
								<Link href={`/admin/forms/${formId}`} style={{ color: '#818cf8' }}>
									Versions tab
								</Link>.
							</p>
						</div>
					) : (
						<div 
							className="p-4 rounded-lg text-center"
							style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
						>
							<p className="text-sm mb-3" style={{ color: '#cbd5e1' }}>
								Test different form versions and optimize conversion rates with A/B testing.
							</p>
							<Link
								href="/admin/billing"
								className="inline-block px-4 py-2 rounded-full text-sm font-medium text-white"
								style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
							>
								Upgrade to Pro
							</Link>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-4">
					<button
						type="submit"
						disabled={saving}
						className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
						style={{
							background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
							boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
						}}
					>
						{saving ? "Saving..." : "Save Settings"}
					</button>
					{error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
					{success && <p className="text-sm" style={{ color: '#10b981' }}>{success}</p>}
				</div>
			</form>
		</div>
	);
}
