import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

export default async function PlatformDashboard() {
	// Get key metrics
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

	const [
		totalTenants,
		newTenantsThisMonth,
		totalUsers,
		totalForms,
		submissionsThisMonth,
		submissionsLastMonth,
		planBreakdown,
		recentTenants,
		recentSubmissions,
	] = await Promise.all([
		prisma.tenant.count(),
		prisma.tenant.count({
			where: { createdAt: { gte: startOfMonth } },
		}),
		prisma.user.count(),
		prisma.form.count(),
		prisma.submissionEvent.count({
			where: { submittedAt: { gte: startOfMonth } },
		}),
		prisma.submissionEvent.count({
			where: { 
				submittedAt: { 
					gte: startOfLastMonth,
					lte: endOfLastMonth,
				} 
			},
		}),
		prisma.tenant.groupBy({
			by: ['plan'],
			_count: { plan: true },
		}),
		prisma.tenant.findMany({
			take: 5,
			orderBy: { createdAt: 'desc' },
			select: {
				id: true,
				name: true,
				plan: true,
				createdAt: true,
				_count: { select: { users: true, forms: true } },
			},
		}),
		prisma.submissionEvent.findMany({
			take: 10,
			orderBy: { submittedAt: 'desc' },
			select: {
				id: true,
				formId: true,
				submittedAt: true,
				durationMs: true,
				form: { select: { name: true, tenant: { select: { name: true } } } },
			},
		}),
	]);

	// Calculate MRR (Monthly Recurring Revenue)
	const planPricing = { free: 0, pro: 29, enterprise: 99 };
	const mrr = planBreakdown.reduce((sum, p) => {
		const price = planPricing[p.plan as keyof typeof planPricing] || 0;
		return sum + (price * p._count.plan);
	}, 0);

	// Submission growth
	const submissionGrowth = submissionsLastMonth > 0 
		? Math.round(((submissionsThisMonth - submissionsLastMonth) / submissionsLastMonth) * 100)
		: 100;

	const godModeLinks = [
		{
			title: "Tenants",
			href: "/platform/tenants",
			description: "Manage plans, usage, and lifecycle for every organization.",
			meta: `${totalTenants} tenants`,
		},
		{
			title: "Users",
			href: "/platform/users",
			description: "Audit access across orgs and jump into user details fast.",
			meta: `${totalUsers} users`,
		},
		{
			title: "Revenue",
			href: "/platform/revenue",
			description: "See ARR, MRR, churn, and billing health at a glance.",
			meta: `$${mrr.toLocaleString()} MRR`,
		},
		{
			title: "Activity",
			href: "/platform/activity",
			description: "Watch submissions flow across the platform in real time.",
			meta: `${submissionsThisMonth.toLocaleString()} this month`,
		},
	];

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
				<p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>
					Overview of your SaaS platform
				</p>
			</div>

			{/* God Mode shortcuts */}
			<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-8">
				{godModeLinks.map((link) => (
					<Link
						key={link.href}
						href={link.href}
						className="group block rounded-xl p-4 transition-transform hover:-translate-y-0.5 hover:shadow-lg"
						style={{ 
							...cardStyle, 
							border: '1px solid rgba(139, 92, 246, 0.25)',
							background: 'rgba(139, 92, 246, 0.07)',
						}}
					>
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="text-[10px] uppercase tracking-[0.08em]" style={{ color: '#a78bfa' }}>
									God mode
								</div>
								<div className="text-lg font-semibold text-white">{link.title}</div>
								<p className="text-xs mt-1 leading-relaxed" style={{ color: '#c4b5fd' }}>
									{link.description}
								</p>
							</div>
							<div className="text-right">
								<div className="text-sm font-semibold text-white">{link.meta}</div>
								<div className="text-xs mt-1" style={{ color: '#a78bfa' }}>Open &gt;</div>
							</div>
						</div>
					</Link>
				))}
			</div>

			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
				<MetricCard
					title="Total Tenants"
					value={totalTenants}
					subtitle={`+${newTenantsThisMonth} this month`}
					icon="🏢"
				/>
				<MetricCard
					title="Monthly Revenue"
					value={`$${mrr.toLocaleString()}`}
					subtitle="MRR"
					icon="💰"
					highlight
				/>
				<MetricCard
					title="Total Users"
					value={totalUsers}
					subtitle="Across all tenants"
					icon="👥"
				/>
				<MetricCard
					title="Submissions"
					value={submissionsThisMonth.toLocaleString()}
					subtitle={`${submissionGrowth >= 0 ? '+' : ''}${submissionGrowth}% vs last month`}
					icon="📬"
				/>
			</div>

			{/* Plan Distribution */}
			<div className="grid gap-6 lg:grid-cols-2 mb-8">
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Plan Distribution</h2>
					<div className="space-y-3">
						{planBreakdown.map((p) => {
							const total = totalTenants || 1;
							const percentage = Math.round((p._count.plan / total) * 100);
							return (
								<div key={p.plan}>
									<div className="flex justify-between text-sm mb-1">
										<span className="capitalize" style={{ color: '#e9d5ff' }}>{p.plan}</span>
										<span style={{ color: '#a78bfa' }}>{p._count.plan} ({percentage}%)</span>
									</div>
									<div className="h-2 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
										<div 
											className="h-2 rounded-full transition-all"
											style={{ 
												width: `${percentage}%`,
												background: p.plan === 'enterprise' ? '#ec4899' 
													: p.plan === 'pro' ? '#8b5cf6' 
													: '#64748b'
											}}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Quick Stats</h2>
					<div className="grid grid-cols-2 gap-4">
						<StatBox label="Total Forms" value={totalForms} />
						<StatBox label="Avg Forms/Tenant" value={totalTenants > 0 ? Math.round(totalForms / totalTenants) : 0} />
						<StatBox label="Avg Users/Tenant" value={totalTenants > 0 ? (totalUsers / totalTenants).toFixed(1) : 0} />
						<StatBox label="Paid Tenants" value={planBreakdown.filter(p => p.plan !== 'free').reduce((s, p) => s + p._count.plan, 0)} />
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Recent Tenants */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-white">Recent Tenants</h2>
						<Link href="/platform/tenants" className="text-sm" style={{ color: '#a78bfa' }}>
							View all →
						</Link>
					</div>
					<div className="space-y-3">
						{recentTenants.map((tenant) => (
							<Link 
								key={tenant.id}
								href={`/platform/tenants/${tenant.id}`}
								className="flex items-center justify-between p-3 rounded-lg transition-colors hover:bg-white/5"
							>
								<div>
									<div className="font-medium text-white">{tenant.name}</div>
									<div className="text-xs" style={{ color: '#a78bfa' }}>
										{tenant._count.users} users · {tenant._count.forms} forms
									</div>
								</div>
								<div className="text-right">
									<span 
										className="px-2 py-0.5 rounded text-xs font-medium capitalize"
										style={{ 
											background: tenant.plan === 'enterprise' ? 'rgba(236, 72, 153, 0.2)' 
												: tenant.plan === 'pro' ? 'rgba(139, 92, 246, 0.2)' 
												: 'rgba(100, 116, 139, 0.2)',
											color: tenant.plan === 'enterprise' ? '#f472b6' 
												: tenant.plan === 'pro' ? '#a78bfa' 
												: '#94a3b8'
										}}
									>
										{tenant.plan}
									</span>
									<div className="text-xs mt-1" style={{ color: '#64748b' }}>
										{new Date(tenant.createdAt).toLocaleDateString()}
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>

				{/* Recent Submissions */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-white">Recent Submissions</h2>
						<Link href="/platform/activity" className="text-sm" style={{ color: '#a78bfa' }}>
							View all →
						</Link>
					</div>
					<div className="space-y-2">
						{recentSubmissions.map((sub) => (
							<div 
								key={sub.id}
								className="flex items-center justify-between p-2 rounded-lg text-sm"
								style={{ background: 'rgba(139, 92, 246, 0.03)' }}
							>
								<div>
									<span className="text-white">{sub.form?.name || 'Unknown form'}</span>
									<span className="mx-2" style={{ color: '#64748b' }}>·</span>
									<span style={{ color: '#a78bfa' }}>{sub.form?.tenant?.name}</span>
								</div>
								<div className="text-xs" style={{ color: '#64748b' }}>
									{sub.durationMs}ms · {new Date(sub.submittedAt).toLocaleTimeString()}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function MetricCard({ 
	title, 
	value, 
	subtitle, 
	icon,
	highlight 
}: { 
	title: string; 
	value: string | number; 
	subtitle: string; 
	icon: string;
	highlight?: boolean;
}) {
	return (
		<div 
			className="rounded-xl p-5"
			style={{
				background: highlight 
					? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))'
					: 'rgba(139, 92, 246, 0.05)',
				border: highlight 
					? '1px solid rgba(139, 92, 246, 0.3)'
					: '1px solid rgba(139, 92, 246, 0.15)',
			}}
		>
			<div className="flex items-center gap-2 mb-2">
				<span className="text-xl">{icon}</span>
				<span className="text-sm" style={{ color: '#a78bfa' }}>{title}</span>
			</div>
			<div className="text-3xl font-bold text-white">{value}</div>
			<div className="text-xs mt-1" style={{ color: '#64748b' }}>{subtitle}</div>
		</div>
	);
}

function StatBox({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="text-center p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
			<div className="text-2xl font-bold text-white">{value}</div>
			<div className="text-xs" style={{ color: '#a78bfa' }}>{label}</div>
		</div>
	);
}





