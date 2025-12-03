import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

export default async function ActivityPage() {
	const now = new Date();
	const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	const [
		recentSubmissions,
		submissions24h,
		submissions7d,
		recentAuditLogs,
		topForms,
	] = await Promise.all([
		prisma.submissionEvent.findMany({
			take: 50,
			orderBy: { submittedAt: 'desc' },
			select: {
				id: true,
				formId: true,
				submittedAt: true,
				durationMs: true,
				status: true,
				httpCode: true,
				form: {
					select: {
						name: true,
						publicId: true,
						tenant: { select: { id: true, name: true } },
					},
				},
			},
		}),
		prisma.submissionEvent.count({
			where: { submittedAt: { gte: last24h } },
		}),
		prisma.submissionEvent.count({
			where: { submittedAt: { gte: last7d } },
		}),
		prisma.auditLog.findMany({
			take: 20,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				action: true,
				resourceType: true,
				resourceId: true,
				metadata: true,
				createdAt: true,
				tenantId: true,
			},
		}),
		prisma.submissionEvent.groupBy({
			by: ['formId'],
			where: { submittedAt: { gte: last7d } },
			_count: { formId: true },
			orderBy: { _count: { formId: 'desc' } },
			take: 5,
		}),
	]);

	// Get form names for top forms
	const topFormIds = topForms.map(f => f.formId);
	const formDetails = await prisma.form.findMany({
		where: { id: { in: topFormIds } },
		select: { id: true, name: true, tenant: { select: { name: true } } },
	});
	const formMap = new Map(formDetails.map(f => [f.id, f]));

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white">Activity</h1>
				<p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>
					Real-time platform activity and audit logs
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 md:grid-cols-3 mb-8">
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-3xl font-bold text-white">{submissions24h.toLocaleString()}</div>
					<div className="text-sm" style={{ color: '#a78bfa' }}>Submissions (24h)</div>
				</div>
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-3xl font-bold text-white">{submissions7d.toLocaleString()}</div>
					<div className="text-sm" style={{ color: '#a78bfa' }}>Submissions (7d)</div>
				</div>
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-3xl font-bold text-white">
						{submissions7d > 0 ? Math.round(submissions7d / 7) : 0}
					</div>
					<div className="text-sm" style={{ color: '#a78bfa' }}>Daily Average</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2 mb-8">
				{/* Top Forms */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Top Forms (7d)</h2>
					<div className="space-y-3">
						{topForms.map((f, i) => {
							const form = formMap.get(f.formId);
							return (
								<div key={f.formId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
									<div className="flex items-center gap-3">
										<span 
											className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
											style={{ 
												background: i === 0 ? 'linear-gradient(to right, #8b5cf6, #ec4899)' : 'rgba(139, 92, 246, 0.2)',
												color: 'white'
											}}
										>
											{i + 1}
										</span>
										<div>
											<div className="text-white text-sm">{form?.name || 'Unknown'}</div>
											<div className="text-xs" style={{ color: '#64748b' }}>{form?.tenant?.name}</div>
										</div>
									</div>
									<span className="font-bold" style={{ color: '#a78bfa' }}>
										{f._count.formId.toLocaleString()}
									</span>
								</div>
							);
						})}
						{topForms.length === 0 && (
							<div className="text-center py-4" style={{ color: '#64748b' }}>
								No submissions yet
							</div>
						)}
					</div>
				</div>

				{/* Recent Audit Logs */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Audit Log</h2>
					<div className="space-y-2 max-h-[300px] overflow-auto">
						{recentAuditLogs.map((log) => (
							<div key={log.id} className="p-2 rounded text-sm" style={{ background: 'rgba(139, 92, 246, 0.03)' }}>
								<div className="flex items-center justify-between">
									<span className="text-white">{log.action}</span>
									<span className="text-xs" style={{ color: '#64748b' }}>
										{new Date(log.createdAt).toLocaleTimeString()}
									</span>
								</div>
								<div className="text-xs" style={{ color: '#a78bfa' }}>
									{log.resourceType}: {log.resourceId.slice(0, 8)}...
								</div>
							</div>
						))}
						{recentAuditLogs.length === 0 && (
							<div className="text-center py-4" style={{ color: '#64748b' }}>
								No audit logs yet
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Recent Submissions */}
			<div className="rounded-xl p-6" style={cardStyle}>
				<h2 className="text-lg font-semibold text-white mb-4">Recent Submissions</h2>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}>
								<th className="text-left px-3 py-2 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Form</th>
								<th className="text-left px-3 py-2 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Tenant</th>
								<th className="text-left px-3 py-2 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Status</th>
								<th className="text-left px-3 py-2 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Duration</th>
								<th className="text-left px-3 py-2 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Time</th>
							</tr>
						</thead>
						<tbody>
							{recentSubmissions.map((sub) => (
								<tr key={sub.id} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.05)' }}>
									<td className="px-3 py-2">
										<div className="text-sm text-white">{sub.form?.name || 'Unknown'}</div>
										<div className="text-xs font-mono" style={{ color: '#64748b' }}>/{sub.form?.publicId}</div>
									</td>
									<td className="px-3 py-2">
										<Link 
											href={`/platform/tenants/${sub.form?.tenant?.id}`}
											className="text-sm hover:underline"
											style={{ color: '#e9d5ff' }}
										>
											{sub.form?.tenant?.name || 'Unknown'}
										</Link>
									</td>
									<td className="px-3 py-2">
										<span 
											className="px-2 py-0.5 rounded text-xs font-medium"
											style={{ 
												background: sub.status === 'success' 
													? 'rgba(16, 185, 129, 0.2)' 
													: 'rgba(239, 68, 68, 0.2)',
												color: sub.status === 'success'
													? '#10b981' 
													: '#f87171'
											}}
										>
											{sub.status} {sub.httpCode ? `(${sub.httpCode})` : ''}
										</span>
									</td>
									<td className="px-3 py-2 text-sm" style={{ color: '#e9d5ff' }}>
										{sub.durationMs}ms
									</td>
									<td className="px-3 py-2 text-xs" style={{ color: '#64748b' }}>
										{new Date(sub.submittedAt).toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

