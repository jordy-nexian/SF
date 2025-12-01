import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import WebhookTestButton from "@/components/WebhookTestButton";
import DuplicateFormButton from "@/components/DuplicateFormButton";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default async function FormDetail({ params }: { params: { id: string } }) {
	const session = await getServerSession(authOptions);
	const tenantId = session?.user?.tenantId;

	if (!tenantId) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Not authenticated
			</div>
		);
	}

	const form = await prisma.form.findFirst({
		where: { id: params.id, tenantId },
		include: {
			versions: { orderBy: { versionNumber: "desc" } },
		},
	});

	if (!form) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Form not found.
			</div>
		);
	}

	// Get stats
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const [totalSubmissions, recentStats] = await Promise.all([
		prisma.submissionEvent.count({ where: { formId: form.id } }),
		prisma.submissionEvent.groupBy({
			by: ['status'],
			where: { formId: form.id, submittedAt: { gte: thirtyDaysAgo } },
			_count: true,
			_avg: { durationMs: true },
		}),
	]);

	const successCount = recentStats.find(s => s.status === 'success')?._count ?? 0;
	const errorCount = recentStats.find(s => s.status === 'error')?._count ?? 0;
	const totalRecent = successCount + errorCount;
	const successRate = totalRecent > 0 ? Math.round((successCount / totalRecent) * 100) : 0;
	const avgLatency = Math.round(recentStats.find(s => s.status === 'success')?._avg?.durationMs ?? 0);

	const stats = {
		totalSubmissions,
		last30Days: {
			total: totalRecent,
			successRate,
			avgLatencyMs: avgLatency,
		},
	};

	const hosted = `/f/${form.publicId}`;
	const iframeSnippet = `<iframe src="${hosted}" width="100%" height="700" frameborder="0"></iframe>`;

	const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
		draft: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308', dot: '#eab308' },
		live: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', dot: '#10b981' },
		archived: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', dot: '#64748b' },
	};
	const statusStyle = STATUS_STYLES[form.status] || STATUS_STYLES.draft;

	async function setStatus(formData: FormData) {
		"use server";
		const newStatus = formData.get("status") as string;
		if (!["draft", "live", "archived"].includes(newStatus)) return;
		
		await prisma.form.update({
			where: { id: params.id },
			data: { status: newStatus as "draft" | "live" | "archived" },
		});
		revalidatePath(`/admin/forms/${params.id}`);
	}

	async function setCurrent(versionId: string) {
		"use server";
		// Verify version belongs to this form
		const version = await prisma.formVersion.findFirst({
			where: { id: versionId, formId: params.id },
		});
		if (!version) return;

		await prisma.form.update({
			where: { id: params.id },
			data: { currentVersionId: versionId },
		});
		revalidatePath(`/admin/forms/${params.id}`);
	}

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-white">{form.name}</h1>
					<span 
						className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
						style={{ background: statusStyle.bg, color: statusStyle.text }}
					>
						<span className="w-1.5 h-1.5 rounded-full" style={{ background: statusStyle.dot }} />
						{form.status}
					</span>
				</div>
				<div className="flex items-center gap-3">
					<DuplicateFormButton formId={form.id} formName={form.name} />
					<Link 
						href={`/admin/forms/${params.id}/settings`} 
						className="rounded-full px-4 py-1.5 text-sm transition-all"
						style={{ border: '1px solid #334155', color: '#cbd5e1' }}
					>
						Settings
					</Link>
					<Link href="/admin" className="text-sm" style={{ color: '#818cf8' }}>← Back</Link>
				</div>
			</div>

			{/* Stats Row */}
			<div className="mb-6 grid gap-4 md:grid-cols-4">
				{[
					{ value: stats.totalSubmissions, label: "Total Submissions", color: "white" },
					{ value: stats.last30Days.total, label: "Last 30 Days", color: "white" },
					{ value: `${stats.last30Days.successRate}%`, label: "Success Rate", color: "#10b981" },
					{ value: `${stats.last30Days.avgLatencyMs}ms`, label: "Avg Latency", color: "white" },
				].map((stat, i) => (
					<div key={i} className="rounded-xl p-4 text-center" style={cardStyle}>
						<div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
						<div className="text-xs" style={{ color: '#64748b' }}>{stat.label}</div>
					</div>
				))}
			</div>

			{stats.totalSubmissions > 0 && (
				<div className="mb-6">
					<Link href={`/admin/forms/${params.id}/analytics`} style={{ color: '#818cf8' }} className="text-sm">
						View detailed analytics →
					</Link>
				</div>
			)}

			<div className="grid gap-6 md:grid-cols-2">
				{/* Status & Settings */}
				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 text-sm font-medium" style={{ color: '#94a3b8' }}>Status</h2>
					<form action={setStatus} className="flex items-center gap-3">
						<select
							name="status"
							defaultValue={form.status}
							className="rounded-lg px-3 py-2 text-sm focus:outline-none"
							style={{ background: '#1e293b', border: '1px solid #334155', color: 'white' }}
						>
							<option value="draft">Draft</option>
							<option value="live">Live</option>
							<option value="archived">Archived</option>
						</select>
						<button
							type="submit"
							className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all"
							style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
						>
							Update
						</button>
					</form>
					<p className="mt-3 text-xs" style={{ color: '#64748b' }}>
						Only <strong style={{ color: '#10b981' }}>Live</strong> forms accept public submissions.
					</p>

					<div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
						<h3 className="mb-3 text-sm font-medium" style={{ color: '#94a3b8' }}>Webhook</h3>
						<WebhookTestButton formId={form.id} />
					</div>
				</div>

				{/* Versions */}
				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 text-sm font-medium" style={{ color: '#94a3b8' }}>Versions</h2>
					<ul className="space-y-2 max-h-48 overflow-y-auto">
						{form.versions.map((v) => (
							<li 
								key={v.id} 
								className="flex items-center justify-between rounded-lg p-3"
								style={{ background: 'rgba(255, 255, 255, 0.03)' }}
							>
								<div>
									<div className="text-sm text-white">v{v.versionNumber}</div>
									<div className="text-xs" style={{ color: '#64748b' }}>{new Date(v.createdAt).toLocaleString()}</div>
								</div>
								<div className="flex items-center gap-2">
									{form.currentVersionId === v.id ? (
										<span 
											className="rounded-full px-2.5 py-1 text-xs font-medium"
											style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}
										>
											Current
										</span>
									) : (
										<form action={setCurrent.bind(null, v.id)}>
											<button 
												type="submit" 
												className="rounded-full px-3 py-1 text-xs transition-all"
												style={{ border: '1px solid #334155', color: '#94a3b8' }}
											>
												Set current
											</button>
										</form>
									)}
								</div>
							</li>
						))}
						{form.versions.length === 0 && (
							<li className="text-sm" style={{ color: '#64748b' }}>No versions yet</li>
						)}
					</ul>
					<div className="mt-4">
						<Link href={`/admin/forms/${params.id}/versions/new`} style={{ color: '#818cf8' }} className="text-sm">
							+ New version
						</Link>
					</div>
				</div>

				{/* Embed */}
				<div className="rounded-xl p-5 md:col-span-2" style={cardStyle}>
					<h2 className="mb-4 text-sm font-medium" style={{ color: '#94a3b8' }}>Embed Options</h2>
					<div className="grid gap-4 md:grid-cols-3">
						<div>
							<div className="text-xs mb-2" style={{ color: '#64748b' }}>Hosted URL</div>
							<code 
								className="block rounded-lg p-3 text-xs break-all font-mono"
								style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#818cf8' }}
							>
								{hosted}
							</code>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>Direct link to the form</p>
						</div>
						<div>
							<div className="text-xs mb-2" style={{ color: '#64748b' }}>Iframe Embed</div>
							<pre 
								className="whitespace-pre-wrap rounded-lg p-3 text-xs font-mono"
								style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#cbd5e1' }}
							>
								{iframeSnippet}
							</pre>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>Simple iframe integration</p>
						</div>
						<div>
							<div className="text-xs mb-2" style={{ color: '#64748b' }}>JS Embed</div>
							<pre 
								className="whitespace-pre-wrap rounded-lg p-3 text-xs font-mono"
								style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#cbd5e1' }}
							>
{`<script src="/embed.js" data-form-id="${form.publicId}"></script>
<div id="stateless-form"></div>`}
							</pre>
							<p className="mt-2 text-xs" style={{ color: '#64748b' }}>Auto-resizing with events</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
