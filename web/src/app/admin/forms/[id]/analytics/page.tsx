"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
					<div
						key={i}
						className="flex-1 flex flex-col items-center group relative"
					>
						<div className="w-full flex flex-col justify-end h-24">
							<div
								className="w-full bg-green-500 rounded-t"
								style={{ height: `${successHeight}%` }}
							/>
							<div
								className="w-full bg-red-400"
								style={{ height: `${height - successHeight}%` }}
							/>
						</div>
						<div className="text-xs text-gray-400 mt-1 rotate-45 origin-left">
							{new Date(d.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
						</div>
						{/* Tooltip */}
						<div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
							{d.date}: {d.submissions} ({d.success} ok, {d.errors} err)
						</div>
					</div>
				);
			})}
		</div>
	);
}

function DropoffFunnel({ steps }: { steps: { step: number; count: number; dropoffRate: number }[] }) {
	if (steps.length === 0) return <p className="text-gray-500 text-sm">No step data available</p>;

	const maxCount = Math.max(...steps.map((s) => s.count), 1);

	return (
		<div className="space-y-2">
			{steps.map((s, i) => (
				<div key={s.step} className="flex items-center gap-3">
					<div className="w-16 text-sm text-gray-600">Step {s.step}</div>
					<div className="flex-1 h-8 bg-gray-100 rounded relative overflow-hidden">
						<div
							className="h-full bg-blue-500 transition-all"
							style={{ width: `${(s.count / maxCount) * 100}%` }}
						/>
						<div className="absolute inset-0 flex items-center px-2 text-sm">
							<span className="font-medium">{s.count}</span>
							{i > 0 && s.dropoffRate > 0 && (
								<span className="ml-2 text-red-600 text-xs">
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

	if (loading) return <div className="p-6">Loading analytics...</div>;
	if (error) return <div className="p-6 text-red-600">{error}</div>;
	if (!data) return <div className="p-6">No data available</div>;

	const maxDaily = Math.max(...data.dailyStats.map((d) => d.submissions), 1);

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Analytics: {data.formName}</h1>
					<p className="text-sm text-gray-600">Last 30 days performance</p>
				</div>
				<Link href={`/admin/forms/${formId}`} className="text-sm text-blue-600">
					← Back to form
				</Link>
			</div>

			{/* Summary Cards */}
			<div className="mb-6 grid gap-4 md:grid-cols-4">
				<div className="rounded-lg border bg-white p-4">
					<div className="text-sm text-gray-600">Total Submissions</div>
					<div className="text-2xl font-semibold">{data.totalSubmissions}</div>
				</div>
				<div className="rounded-lg border bg-white p-4">
					<div className="text-sm text-gray-600">Last 30 Days</div>
					<div className="text-2xl font-semibold">{data.last30Days.total}</div>
				</div>
				<div className="rounded-lg border bg-white p-4">
					<div className="text-sm text-gray-600">Success Rate</div>
					<div className="text-2xl font-semibold text-green-600">
						{data.last30Days.successRate}%
					</div>
				</div>
				<div className="rounded-lg border bg-white p-4">
					<div className="text-sm text-gray-600">Avg Latency</div>
					<div className="text-2xl font-semibold">{data.last30Days.avgLatencyMs}ms</div>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Daily Chart */}
				<div className="rounded-lg border bg-white p-4">
					<h2 className="mb-4 font-medium">Submissions Over Time</h2>
					<SimpleBarChart data={data.dailyStats} maxValue={maxDaily} />
					<div className="mt-4 flex items-center gap-4 text-xs">
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-green-500 rounded" />
							<span>Success</span>
						</div>
						<div className="flex items-center gap-1">
							<div className="w-3 h-3 bg-red-400 rounded" />
							<span>Errors</span>
						</div>
					</div>
				</div>

				{/* Step Drop-off */}
				<div className="rounded-lg border bg-white p-4">
					<h2 className="mb-4 font-medium">Step Drop-off Analysis</h2>
					<DropoffFunnel steps={data.stepDropoff} />
					<p className="mt-3 text-xs text-gray-500">
						Shows how many submissions reached each step
					</p>
				</div>
			</div>

			{/* Recent Submissions */}
			<div className="mt-6 rounded-lg border bg-white p-4">
				<h2 className="mb-4 font-medium">Recent Submissions</h2>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 text-gray-600">
							<tr>
								<th className="px-3 py-2 text-left">Submission ID</th>
								<th className="px-3 py-2 text-left">Status</th>
								<th className="px-3 py-2 text-left">HTTP Code</th>
								<th className="px-3 py-2 text-left">Latency</th>
								<th className="px-3 py-2 text-left">Fields</th>
								<th className="px-3 py-2 text-left">Time</th>
							</tr>
						</thead>
						<tbody>
							{data.recentSubmissions.map((sub) => (
								<tr key={sub.id} className="border-t">
									<td className="px-3 py-2 font-mono text-xs">{sub.submissionId.slice(0, 12)}...</td>
									<td className="px-3 py-2">
										<span
											className={`rounded px-2 py-0.5 text-xs ${
												sub.status === "success"
													? "bg-green-100 text-green-700"
													: "bg-red-100 text-red-700"
											}`}
										>
											{sub.status}
										</span>
									</td>
									<td className="px-3 py-2">{sub.httpCode ?? "-"}</td>
									<td className="px-3 py-2">{sub.durationMs}ms</td>
									<td className="px-3 py-2">{sub.fieldCount ?? "-"}</td>
									<td className="px-3 py-2 text-gray-600">
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

