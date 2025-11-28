"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

type DailyStats = {
	date: string;
	submissions: number;
	success: number;
	errors: number;
};

type AnalyticsData = {
	formName: string;
	totalSubmissions: number;
	last30Days: {
		total: number;
		success: number;
		errors: number;
		successRate: number;
		avgLatencyMs: number;
	};
	dailyStats: DailyStats[];
	stepDropoff: { step: number; count: number; dropoffRate: number }[];
	recentSubmissions: {
		id: string;
		submissionId: string;
		status: string;
		httpCode: number | null;
		durationMs: number;
		submittedAt: string;
		fieldCount: number | null;
	}[];
};

function SimpleBarChart({ data, maxValue }: { data: DailyStats[]; maxValue: number }) {
	return (
		<div className="flex items-end gap-1 h-32">
			{data.map((d, i) => {
				const height = maxValue > 0 ? (d.submissions / maxValue) * 100 : 0;
				const successHeight = maxValue > 0 ? (d.success / maxValue) * 100 : 0;
				return (
					<div key={i} className="flex-1 flex flex-col items-center group relative">
						<div className="w-full flex flex-col justify-end h-24">
							<div
								className="w-full rounded-t"
								style={{ height: `${successHeight}%`, background: '#10b981' }}
							/>
							<div
								className="w-full"
								style={{ height: `${height - successHeight}%`, background: '#f87171' }}
							/>
						</div>
						<div className="text-xs mt-1 rotate-45 origin-left" style={{ color: '#64748b' }}>
							{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
						</div>
						{/* Tooltip */}
						<div 
							className="absolute bottom-full mb-2 hidden group-hover:block text-xs rounded px-2 py-1 whitespace-nowrap z-10"
							style={{ background: '#1e293b', color: 'white' }}
						>
							{d.date}: {d.submissions} ({d.success} ok, {d.errors} err)
						</div>
					</div>
				);
			})}
		</div>
	);
}

function DropoffFunnel({ steps }: { steps: { step: number; count: number; dropoffRate: number }[] }) {
	if (steps.length === 0) return <p className="text-sm" style={{ color: '#64748b' }}>No step data available</p>;

	const maxCount = Math.max(...steps.map((s) => s.count), 1);

	return (
		<div className="space-y-3">
			{steps.map((s, i) => (
				<div key={s.step} className="flex items-center gap-3">
					<div className="w-16 text-sm" style={{ color: '#94a3b8' }}>Step {s.step}</div>
					<div className="flex-1 h-8 rounded-lg relative overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
						<div
							className="h-full transition-all rounded-lg"
							style={{ width: `${(s.count / maxCount) * 100}%`, background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
						/>
						<div className="absolute inset-0 flex items-center px-3 text-sm text-white">
							<span className="font-medium">{s.count}</span>
							{i > 0 && s.dropoffRate > 0 && (
								<span className="ml-2 text-xs" style={{ color: '#f87171' }}>
									-{s.dropoffRate.toFixed(1)}%
								</span>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default function FormAnalyticsPage() {
	const params = useParams();
	const formId = params.id as string;

	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<AnalyticsData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch(`/api/admin/forms/${formId}/analytics`)
			.then((r) => (r.ok ? r.json() : Promise.reject("Failed to load")))
			.then(setData)
			.catch((e) => setError(e.message || "Failed to load analytics"))
			.finally(() => setLoading(false));
	}, [formId]);

	if (loading) return <div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>Loading analytics...</div>;
	if (error) return <div className="p-6" style={{ color: '#f87171' }}>{error}</div>;
	if (!data) return <div className="p-6" style={{ color: '#94a3b8' }}>No data available</div>;

	const maxDaily = Math.max(...data.dailyStats.map((d) => d.submissions), 1);

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">Analytics: {data.formName}</h1>
					<p className="text-sm" style={{ color: '#94a3b8' }}>Last 30 days performance</p>
				</div>
				<Link href={`/admin/forms/${formId}`} className="text-sm" style={{ color: '#818cf8' }}>
					← Back to form
				</Link>
			</div>

			{/* Summary Cards */}
			<div className="mb-6 grid gap-4 md:grid-cols-4">
				{[
					{ label: "Total Submissions", value: data.totalSubmissions, color: "white" },
					{ label: "Last 30 Days", value: data.last30Days.total, color: "white" },
					{ label: "Success Rate", value: `${data.last30Days.successRate}%`, color: "#10b981" },
					{ label: "Avg Latency", value: `${data.last30Days.avgLatencyMs}ms`, color: "white" },
				].map((stat, i) => (
					<div key={i} className="rounded-xl p-4" style={cardStyle}>
						<div className="text-sm" style={{ color: '#94a3b8' }}>{stat.label}</div>
						<div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
					</div>
				))}
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Daily Chart */}
				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Submissions Over Time</h2>
					<SimpleBarChart data={data.dailyStats} maxValue={maxDaily} />
					<div className="mt-4 flex items-center gap-4 text-xs" style={{ color: '#94a3b8' }}>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 rounded" style={{ background: '#10b981' }} />
							<span>Success</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 rounded" style={{ background: '#f87171' }} />
							<span>Errors</span>
						</div>
					</div>
				</div>

				{/* Step Drop-off */}
				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Step Drop-off Analysis</h2>
					<DropoffFunnel steps={data.stepDropoff} />
					<p className="mt-3 text-xs" style={{ color: '#64748b' }}>
						Shows how many submissions reached each step
					</p>
				</div>
			</div>

			{/* Recent Submissions */}
			<div className="mt-6 rounded-xl p-5" style={cardStyle}>
				<h2 className="mb-4 font-semibold text-white">Recent Submissions</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
							<tr>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>Submission ID</th>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>Status</th>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>HTTP Code</th>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>Latency</th>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>Fields</th>
								<th className="px-3 py-2 text-left font-medium" style={{ color: '#94a3b8' }}>Time</th>
							</tr>
						</thead>
						<tbody>
							{data.recentSubmissions.map((sub) => (
								<tr key={sub.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
									<td className="px-3 py-2 font-mono text-xs" style={{ color: '#cbd5e1' }}>{sub.submissionId.slice(0, 12)}...</td>
									<td className="px-3 py-2">
										<span
											className="rounded-full px-2 py-0.5 text-xs font-medium"
											style={{
												background: sub.status === "success" ? 'rgba(16, 185, 129, 0.1)' : 'rgba(248, 113, 113, 0.1)',
												color: sub.status === "success" ? '#10b981' : '#f87171',
											}}
										>
											{sub.status}
										</span>
									</td>
									<td className="px-3 py-2" style={{ color: '#cbd5e1' }}>{sub.httpCode ?? "-"}</td>
									<td className="px-3 py-2" style={{ color: '#cbd5e1' }}>{sub.durationMs}ms</td>
									<td className="px-3 py-2" style={{ color: '#cbd5e1' }}>{sub.fieldCount ?? "-"}</td>
									<td className="px-3 py-2" style={{ color: '#64748b' }}>
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
