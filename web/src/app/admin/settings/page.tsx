"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

export default function TenantSettingsPage() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [tenantName, setTenantName] = useState("");
	const [defaultWebhookUrl, setDefaultWebhookUrl] = useState("");
	const [sharedSecret, setSharedSecret] = useState("");

	useEffect(() => {
		fetch("/api/admin/tenant")
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					setTenantName(data.name || "");
					setDefaultWebhookUrl(data.defaultN8nWebhookUrl || "");
					setSharedSecret(data.sharedSecret || "");
				}
			})
			.finally(() => setLoading(false));
	}, []);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		setSaving(true);

		try {
			const res = await fetch("/api/admin/tenant", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: tenantName,
					defaultN8nWebhookUrl: defaultWebhookUrl || null,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to save settings");
			}

			setSuccess("Settings saved successfully!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function regenerateSecret() {
		if (!confirm("Are you sure? This will invalidate all existing webhook signatures.")) {
			return;
		}

		try {
			const res = await fetch("/api/admin/tenant/regenerate-secret", {
				method: "POST",
			});

			if (!res.ok) throw new Error("Failed to regenerate secret");

			const data = await res.json();
			setSharedSecret(data.sharedSecret);
			setSuccess("Secret regenerated! Update your n8n webhook verification.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to regenerate");
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
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-white">Account Settings</h1>
				<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
					Configure your organization&apos;s default settings
				</p>
			</div>

			<form onSubmit={onSubmit} className="space-y-6">
				{/* Organization */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Organization</h2>
					<div>
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
							Organization Name
						</label>
						<input
							type="text"
							className="w-full rounded-lg px-3 py-2.5 focus:outline-none"
							style={inputStyle}
							value={tenantName}
							onChange={(e) => setTenantName(e.target.value)}
							required
						/>
					</div>
				</div>

				{/* n8n Integration */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">n8n Integration</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
								Default Webhook URL
							</label>
							<input
								type="url"
								className="w-full rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none"
								style={inputStyle}
								value={defaultWebhookUrl}
								onChange={(e) => setDefaultWebhookUrl(e.target.value)}
								placeholder="https://your-n8n-instance.com/webhook/abc123"
							/>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								This webhook will receive all form submissions unless overridden at the form level.
							</p>
						</div>

						<div 
							className="rounded-lg p-4"
							style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
						>
							<h3 className="text-sm font-medium mb-2" style={{ color: '#818cf8' }}>
								How to get your n8n webhook URL:
							</h3>
							<ol className="text-xs space-y-1.5" style={{ color: '#94a3b8' }}>
								<li>1. In n8n, create a new workflow</li>
								<li>2. Add a <strong>Webhook</strong> node as the trigger</li>
								<li>3. Set the HTTP Method to <strong>POST</strong></li>
								<li>4. Copy the <strong>Production URL</strong> and paste it above</li>
								<li>5. Activate the workflow</li>
							</ol>
						</div>
					</div>
				</div>

				{/* Security */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Security</h2>
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>
								Webhook Signing Secret
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									className="flex-1 rounded-lg px-3 py-2.5 font-mono text-sm focus:outline-none"
									style={{ ...inputStyle, background: '#0f172a' }}
									value={sharedSecret}
									readOnly
								/>
								<button
									type="button"
									onClick={() => navigator.clipboard.writeText(sharedSecret)}
									className="rounded-lg px-3 py-2 text-sm transition-colors"
									style={{ border: '1px solid #334155', color: '#94a3b8' }}
								>
									Copy
								</button>
							</div>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
								Use this secret to verify webhook signatures in n8n. 
								<Link href="/admin/docs/webhook-verification" className="ml-1" style={{ color: '#818cf8' }}>
									Learn how →
								</Link>
							</p>
						</div>

						<button
							type="button"
							onClick={regenerateSecret}
							className="text-sm transition-colors"
							style={{ color: '#f87171' }}
						>
							Regenerate Secret
						</button>
					</div>
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

