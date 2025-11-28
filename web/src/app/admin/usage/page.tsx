import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

async function getUsage(tenantId: string) {
	const hdrs = await headers();
	const host = hdrs.get("host");
	const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
	const base = baseEnv && /^https?:\/\//i.test(baseEnv) ? baseEnv : host ? `https://${host}` : "";
	const res = await fetch(`${base}/api/admin/tenants/${tenantId}/usage`, { cache: "no-store" });
	if (!res.ok) return null;
	return res.json();
}

export default async function UsagePage() {
	const session = await getServerSession(authOptions);
	const tenantId = (session as any)?.user?.tenantId as string | undefined;
	
	if (!tenantId) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				No tenant in session.
			</div>
		);
	}

	const usage = await getUsage(tenantId);
	if (!usage) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#f87171' }}>
				Failed to load usage.
			</div>
		);
	}

	const counts = usage.counts || {};
	const total = (counts.success || 0) + (counts.error || 0);
	const successRate = total > 0 ? Math.round((counts.success / total) * 100) : 0;

	return (
		<div className="mx-auto max-w-6xl">
			<h1 className="mb-6 text-2xl font-bold text-white">Usage (last 30 days)</h1>
			
			<div className="grid gap-4 md:grid-cols-4">
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-sm" style={{ color: '#94a3b8' }}>Total Submissions</div>
					<div className="mt-1 text-3xl font-bold text-white">{total}</div>
				</div>
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-sm" style={{ color: '#94a3b8' }}>Successful</div>
					<div className="mt-1 text-3xl font-bold" style={{ color: '#10b981' }}>{counts.success || 0}</div>
				</div>
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-sm" style={{ color: '#94a3b8' }}>Errors</div>
					<div className="mt-1 text-3xl font-bold" style={{ color: '#f87171' }}>{counts.error || 0}</div>
				</div>
				<div className="rounded-xl p-5" style={cardStyle}>
					<div className="text-sm" style={{ color: '#94a3b8' }}>Success Rate</div>
					<div className="mt-1 text-3xl font-bold" style={{ color: '#10b981' }}>{successRate}%</div>
				</div>
			</div>

			<div className="mt-6 rounded-xl p-5" style={cardStyle}>
				<div className="text-sm" style={{ color: '#94a3b8' }}>Average Latency to n8n</div>
				<div className="mt-1 text-3xl font-bold text-white">{Math.round(usage.averageLatencyMs || 0)}ms</div>
				<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
					Time from form submission to webhook delivery confirmation
				</p>
			</div>

			{/* Usage bar */}
			<div className="mt-6 rounded-xl p-5" style={cardStyle}>
				<div className="flex items-center justify-between mb-3">
					<span className="text-sm font-medium text-white">Monthly Usage</span>
					<span className="text-sm" style={{ color: '#94a3b8' }}>{total} / 10,000 submissions</span>
				</div>
				<div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
					<div 
						className="h-full rounded-full transition-all"
						style={{ 
							width: `${Math.min((total / 10000) * 100, 100)}%`,
							background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
						}}
					/>
				</div>
				<p className="mt-2 text-xs" style={{ color: '#64748b' }}>
					{10000 - total} submissions remaining this month
				</p>
			</div>
		</div>
	);
}
