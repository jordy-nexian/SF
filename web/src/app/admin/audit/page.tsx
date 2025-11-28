"use client";

import { useEffect, useState } from "react";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

type AuditEntry = {
	id: string;
	userId: string;
	action: string;
	resourceType: string;
	resourceId: string;
	metadata: Record<string, unknown> | null;
	ipAddress: string | null;
	createdAt: string;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
	"form.created": { label: "Form Created", color: "#10b981" },
	"form.updated": { label: "Form Updated", color: "#818cf8" },
	"form.deleted": { label: "Form Deleted", color: "#f87171" },
	"form.published": { label: "Form Published", color: "#10b981" },
	"form.archived": { label: "Form Archived", color: "#64748b" },
	"form.duplicated": { label: "Form Duplicated", color: "#818cf8" },
	"version.created": { label: "Version Created", color: "#10b981" },
	"version.activated": { label: "Version Activated", color: "#818cf8" },
	"theme.updated": { label: "Theme Updated", color: "#818cf8" },
	"settings.updated": { label: "Settings Updated", color: "#818cf8" },
	"webhook.tested": { label: "Webhook Tested", color: "#eab308" },
};

export default function AuditLogPage() {
	const [logs, setLogs] = useState<AuditEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/admin/audit")
			.then((r) => (r.ok ? r.json() : Promise.reject("Failed to load")))
			.then((data) => setLogs(data.logs || []))
			.catch((e) => setError(e.message || "Failed to load audit logs"))
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>Loading audit logs...</div>;
	if (error) return <div className="p-6" style={{ color: '#f87171' }}>{error}</div>;

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-white">Audit Log</h1>
				<p className="text-sm" style={{ color: '#94a3b8' }}>Track all administrative actions</p>
			</div>

			<div className="rounded-xl overflow-hidden" style={cardStyle}>
				<table className="w-full text-sm">
					<thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
						<tr>
							<th className="px-5 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Time</th>
							<th className="px-5 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Action</th>
							<th className="px-5 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Resource</th>
							<th className="px-5 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>Details</th>
							<th className="px-5 py-3 text-left font-medium" style={{ color: '#94a3b8' }}>IP</th>
						</tr>
					</thead>
					<tbody>
						{logs.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-5 py-12 text-center" style={{ color: '#64748b' }}>
									<div className="flex flex-col items-center gap-3">
										<div 
											className="w-12 h-12 rounded-full flex items-center justify-center"
											style={{ background: 'rgba(255, 255, 255, 0.05)' }}
										>
											<svg className="w-6 h-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
											</svg>
										</div>
										<p>No audit logs yet</p>
									</div>
								</td>
							</tr>
						) : (
							logs.map((log) => {
								const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: '#94a3b8' };
								return (
									<tr key={log.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
										<td className="px-5 py-4" style={{ color: '#64748b' }}>
											{new Date(log.createdAt).toLocaleString()}
										</td>
										<td className="px-5 py-4">
											<span 
												className="rounded-full px-2.5 py-1 text-xs font-medium"
												style={{ background: `${actionInfo.color}15`, color: actionInfo.color }}
											>
												{actionInfo.label}
											</span>
										</td>
										<td className="px-5 py-4">
											<span style={{ color: '#64748b' }}>{log.resourceType}:</span>{" "}
											<span className="font-mono text-xs" style={{ color: '#818cf8' }}>{log.resourceId.slice(0, 12)}...</span>
										</td>
										<td className="px-5 py-4 text-xs" style={{ color: '#64748b' }}>
											{log.metadata ? (
												<details>
													<summary className="cursor-pointer transition-colors" style={{ color: '#94a3b8' }}>
														View details
													</summary>
													<pre 
														className="mt-2 rounded-lg p-3 text-xs overflow-auto"
														style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#cbd5e1' }}
													>
														{JSON.stringify(log.metadata, null, 2)}
													</pre>
												</details>
											) : (
												"-"
											)}
										</td>
										<td className="px-5 py-4 font-mono text-xs" style={{ color: '#64748b' }}>
											{log.ipAddress || "-"}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
