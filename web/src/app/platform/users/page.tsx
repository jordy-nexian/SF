import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

export default async function UsersPage() {
	const users = await prisma.user.findMany({
		orderBy: { createdAt: 'desc' },
		take: 100,
		select: {
			id: true,
			email: true,
			role: true,
			createdAt: true,
			tenant: {
				select: {
					id: true,
					name: true,
					plan: true,
				},
			},
		},
	});

	const totalUsers = await prisma.user.count();

	// Role breakdown
	const roleBreakdown = await prisma.user.groupBy({
		by: ['role'],
		_count: { role: true },
	});

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-white">Users</h1>
					<p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>
						{totalUsers} total users across all tenants
					</p>
				</div>
			</div>

			{/* Stats */}
			<div className="grid gap-4 md:grid-cols-4 mb-8">
				<div className="rounded-xl p-4" style={cardStyle}>
					<div className="text-2xl font-bold text-white">{totalUsers}</div>
					<div className="text-sm" style={{ color: '#a78bfa' }}>Total Users</div>
				</div>
				{roleBreakdown.map((r) => (
					<div key={r.role} className="rounded-xl p-4" style={cardStyle}>
						<div className="text-2xl font-bold text-white">{r._count.role}</div>
						<div className="text-sm capitalize" style={{ color: '#a78bfa' }}>{r.role}s</div>
					</div>
				))}
			</div>

			{/* Users Table */}
			<div className="rounded-xl overflow-hidden" style={cardStyle}>
				<table className="w-full">
					<thead style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
						<tr>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Email</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Role</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Organization</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Plan</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Joined</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr key={user.id} style={{ borderTop: '1px solid rgba(139, 92, 246, 0.1)' }}>
								<td className="px-4 py-3 text-sm text-white">{user.email}</td>
								<td className="px-4 py-3">
									<span 
										className="px-2 py-0.5 rounded text-xs font-medium capitalize"
										style={{ 
											background: user.role === 'owner' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(139, 92, 246, 0.2)',
											color: user.role === 'owner' ? '#f472b6' : '#a78bfa'
										}}
									>
										{user.role}
									</span>
								</td>
								<td className="px-4 py-3">
									<Link 
										href={`/platform/tenants/${user.tenant.id}`}
										className="text-sm hover:underline"
										style={{ color: '#e9d5ff' }}
									>
										{user.tenant.name}
									</Link>
								</td>
								<td className="px-4 py-3">
									<span 
										className="px-2 py-0.5 rounded text-xs font-medium capitalize"
										style={{ 
											background: user.tenant.plan === 'enterprise' ? 'rgba(236, 72, 153, 0.2)' 
												: user.tenant.plan === 'pro' ? 'rgba(139, 92, 246, 0.2)' 
												: 'rgba(100, 116, 139, 0.2)',
											color: user.tenant.plan === 'enterprise' ? '#f472b6' 
												: user.tenant.plan === 'pro' ? '#a78bfa' 
												: '#94a3b8'
										}}
									>
										{user.tenant.plan}
									</span>
								</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
									{new Date(user.createdAt).toLocaleDateString()}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{users.length === 0 && (
					<div className="p-8 text-center" style={{ color: '#64748b' }}>
						No users found
					</div>
				)}
			</div>
		</div>
	);
}












