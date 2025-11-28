"use client";

import { useEffect, useState } from "react";

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

const ACTION_LABELS: Record<string, string> = {
	"form.created": "Form Created",
	"form.updated": "Form Updated",
	"form.deleted": "Form Deleted",
	"form.published": "Form Published",
	"form.archived": "Form Archived",
	"form.duplicated": "Form Duplicated",
	"version.created": "Version Created",
	"version.activated": "Version Activated",
	"theme.updated": "Theme Updated",
	"settings.updated": "Settings Updated",
	"webhook.tested": "Webhook Tested",
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

	if (loading) return <div className="p-6">Loading audit logs...</div>;
	if (error) return <div className="p-6 text-red-600">{error}</div>;

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6">
				<h1 className="text-xl font-semibold">Audit Log</h1>
				<p className="text-sm text-gray-600">Track all administrative actions</p>
			</div>

			<div className="rounded-lg border bg-white">
				<table className="w-full text-sm">
					<thead className="bg-gray-50 text-gray-600">
						<tr>
							<th className="px-4 py-3 text-left">Time</th>
							<th className="px-4 py-3 text-left">Action</th>
							<th className="px-4 py-3 text-left">Resource</th>
							<th className="px-4 py-3 text-left">Details</th>
							<th className="px-4 py-3 text-left">IP</th>
						</tr>
					</thead>
					<tbody>
						{logs.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-gray-500">
									No audit logs yet
								</td>
							</tr>
						) : (
							logs.map((log) => (
								<tr key={log.id} className="border-t">
									<td className="px-4 py-3 text-gray-600">
										{new Date(log.createdAt).toLocaleString()}
									</td>
									<td className="px-4 py-3">
										<span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
											{ACTION_LABELS[log.action] || log.action}
										</span>
									</td>
									<td className="px-4 py-3">
										<span className="text-gray-500">{log.resourceType}:</span>{" "}
										<span className="font-mono text-xs">{log.resourceId.slice(0, 12)}...</span>
									</td>
									<td className="px-4 py-3 text-xs text-gray-600">
										{log.metadata ? (
											<details>
												<summary className="cursor-pointer hover:text-gray-900">
													View details
												</summary>
												<pre className="mt-1 rounded bg-gray-50 p-2 text-xs">
													{JSON.stringify(log.metadata, null, 2)}
												</pre>
											</details>
										) : (
											"-"
										)}
									</td>
									<td className="px-4 py-3 font-mono text-xs text-gray-500">
										{log.ipAddress || "-"}
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

