import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import DeleteFormButton from "@/components/DeleteFormButton";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
	const session = await getServerSession(authOptions);
	const tenantId = session?.user?.tenantId;

	if (!tenantId) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Not authenticated
			</div>
		);
	}

	const forms = await prisma.form.findMany({
		where: { tenantId },
		orderBy: { updatedAt: "desc" },
		select: {
			id: true,
			name: true,
			publicId: true,
			status: true,
			updatedAt: true,
		},
	});

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="text-2xl font-bold text-white">Forms</h1>
				<div className="flex gap-3">
					<Link 
						href="/admin/forms/new/templates" 
						className="rounded-full px-4 py-2 text-sm font-medium transition-all"
						style={{ border: '1px solid #334155', color: '#cbd5e1' }}
					>
						Templates
					</Link>
					<Link 
						href="/admin/forms/builder" 
						className="rounded-full px-4 py-2 text-sm font-medium transition-all"
						style={{ 
							background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
							color: 'white',
							boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
						}}
					>
						+ New Form
					</Link>
				</div>
			</div>

			<div 
				className="overflow-hidden rounded-xl"
				style={{ 
					background: 'rgba(255, 255, 255, 0.05)',
					border: '1px solid rgba(255, 255, 255, 0.1)',
				}}
			>
				<table className="min-w-full text-left text-sm">
					<thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
						<tr>
							<th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Name</th>
							<th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Public URL</th>
							<th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Status</th>
							<th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Updated</th>
							<th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}></th>
						</tr>
					</thead>
					<tbody>
						{forms.map((f) => (
							<tr key={f.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
								<td className="px-5 py-4 font-medium text-white">{f.name}</td>
								<td className="px-5 py-4">
									<Link 
										href={`/f/${f.publicId}`} 
										target="_blank"
										className="font-mono text-sm transition-colors"
										style={{ color: '#818cf8' }}
									>
										/f/{f.publicId}
									</Link>
								</td>
								<td className="px-5 py-4">
									<StatusBadge status={f.status} />
								</td>
								<td className="px-5 py-4" style={{ color: '#64748b' }}>
									{new Date(f.updatedAt).toLocaleDateString()}
								</td>
								<td className="px-5 py-4">
									<div className="flex items-center gap-3">
										<Link 
											href={`/admin/forms/${f.id}`}
											className="text-sm transition-colors"
											style={{ color: '#94a3b8' }}
										>
											Edit →
										</Link>
										<DeleteFormButton formId={f.id} formName={f.name} />
									</div>
								</td>
							</tr>
						))}
						{forms.length === 0 && (
							<tr>
								<td className="px-5 py-12 text-center" colSpan={5} style={{ color: '#64748b' }}>
									<div className="flex flex-col items-center gap-3">
										<div 
											className="w-12 h-12 rounded-full flex items-center justify-center"
											style={{ background: 'rgba(255, 255, 255, 0.05)' }}
										>
											<svg className="w-6 h-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
										</div>
										<p>No forms yet. Create one to get started.</p>
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function StatusBadge({ status }: { status: string }) {
	const styles: Record<string, { bg: string; text: string; dot: string }> = {
		live: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', dot: '#10b981' },
		draft: { bg: 'rgba(234, 179, 8, 0.1)', text: '#eab308', dot: '#eab308' },
		archived: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', dot: '#64748b' },
	};
	const style = styles[status] || styles.draft;

	return (
		<span 
			className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize"
			style={{ background: style.bg, color: style.text }}
		>
			<span className="w-1.5 h-1.5 rounded-full" style={{ background: style.dot }} />
			{status}
		</span>
	);
}
