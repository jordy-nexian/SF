import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

const planPricing = { free: 0, pro: 29, enterprise: 99 };
const annualPricing = { free: 0, pro: 24, enterprise: 82 };

export default async function RevenuePage() {
	const now = new Date();
	
	// Get last 12 months for trend data
	const months = Array.from({ length: 12 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		return {
			start: d,
			end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
			label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
		};
	}).reverse();

	// Get current subscription breakdown
	const subscriptionBreakdown = await prisma.tenant.groupBy({
		by: ['plan', 'billingCycle', 'subscriptionStatus'],
		_count: { id: true },
	});

	// Calculate MRR
	let mrr = 0;
	let arr = 0;
	const breakdown: Record<string, { monthly: number; annual: number; total: number }> = {
		pro: { monthly: 0, annual: 0, total: 0 },
		enterprise: { monthly: 0, annual: 0, total: 0 },
	};

	subscriptionBreakdown.forEach(row => {
		if (row.subscriptionStatus !== 'active' && row.subscriptionStatus !== 'trialing') return;
		if (row.plan === 'free') return;

		const count = row._count.id;
		const isAnnual = row.billingCycle === 'annual';
		const monthlyRate = isAnnual 
			? annualPricing[row.plan as keyof typeof annualPricing]
			: planPricing[row.plan as keyof typeof planPricing];

		mrr += monthlyRate * count;
		
		if (breakdown[row.plan]) {
			if (isAnnual) {
				breakdown[row.plan].annual += count;
			} else {
				breakdown[row.plan].monthly += count;
			}
			breakdown[row.plan].total += count;
		}
	});

	arr = mrr * 12;

	// Get new subscriptions by month (approximation based on tenant creation)
	const monthlyNewSubscriptions = await Promise.all(
		months.map(async (m) => {
			const count = await prisma.tenant.count({
				where: {
					createdAt: { gte: m.start, lte: m.end },
					plan: { not: 'free' },
				},
			});
			return { ...m, count };
		})
	);

	// Get churn (canceled subscriptions)
	const canceledCount = subscriptionBreakdown
		.filter(r => r.subscriptionStatus === 'canceled')
		.reduce((sum, r) => sum + r._count.id, 0);

	const totalPaid = breakdown.pro.total + breakdown.enterprise.total;
	const churnRate = totalPaid > 0 ? ((canceledCount / (totalPaid + canceledCount)) * 100).toFixed(1) : '0';

	// Average revenue per user
	const arpu = totalPaid > 0 ? Math.round(mrr / totalPaid) : 0;

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white">Revenue</h1>
				<p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>
					Financial metrics and subscription analytics
				</p>
			</div>

			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
				<MetricCard
					title="Monthly Recurring Revenue"
					value={`$${mrr.toLocaleString()}`}
					subtitle="MRR"
					highlight
				/>
				<MetricCard
					title="Annual Run Rate"
					value={`$${arr.toLocaleString()}`}
					subtitle="ARR"
				/>
				<MetricCard
					title="Paying Customers"
					value={totalPaid}
					subtitle={`${breakdown.pro.total} Pro + ${breakdown.enterprise.total} Enterprise`}
				/>
				<MetricCard
					title="Avg Revenue Per User"
					value={`$${arpu}`}
					subtitle="ARPU"
				/>
			</div>

			{/* Subscription Breakdown */}
			<div className="grid gap-6 lg:grid-cols-2 mb-8">
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Subscription Breakdown</h2>
					<div className="space-y-4">
						<div className="p-4 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
							<div className="flex justify-between items-center mb-2">
								<span className="font-medium" style={{ color: '#a78bfa' }}>Pro Plan</span>
								<span className="text-white font-bold">${breakdown.pro.total * 29}/mo potential</span>
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span style={{ color: '#64748b' }}>Monthly billing:</span>
									<span className="ml-2 text-white">{breakdown.pro.monthly}</span>
								</div>
								<div>
									<span style={{ color: '#64748b' }}>Annual billing:</span>
									<span className="ml-2 text-white">{breakdown.pro.annual}</span>
								</div>
							</div>
						</div>
						<div className="p-4 rounded-lg" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
							<div className="flex justify-between items-center mb-2">
								<span className="font-medium" style={{ color: '#f472b6' }}>Enterprise Plan</span>
								<span className="text-white font-bold">${breakdown.enterprise.total * 99}/mo potential</span>
							</div>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span style={{ color: '#64748b' }}>Monthly billing:</span>
									<span className="ml-2 text-white">{breakdown.enterprise.monthly}</span>
								</div>
								<div>
									<span style={{ color: '#64748b' }}>Annual billing:</span>
									<span className="ml-2 text-white">{breakdown.enterprise.annual}</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Health Metrics</h2>
					<div className="space-y-4">
						<div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
							<span style={{ color: '#a78bfa' }}>Churn Rate</span>
							<span 
								className="font-bold"
								style={{ color: parseFloat(churnRate) > 5 ? '#f87171' : '#10b981' }}
							>
								{churnRate}%
							</span>
						</div>
						<div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
							<span style={{ color: '#a78bfa' }}>Annual vs Monthly</span>
							<span className="font-bold text-white">
								{totalPaid > 0 
									? Math.round(((breakdown.pro.annual + breakdown.enterprise.annual) / totalPaid) * 100)
									: 0
								}% annual
							</span>
						</div>
						<div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
							<span style={{ color: '#a78bfa' }}>Past Due</span>
							<span 
								className="font-bold"
								style={{ color: subscriptionBreakdown.filter(r => r.subscriptionStatus === 'past_due').reduce((s, r) => s + r._count.id, 0) > 0 ? '#f59e0b' : '#10b981' }}
							>
								{subscriptionBreakdown.filter(r => r.subscriptionStatus === 'past_due').reduce((s, r) => s + r._count.id, 0)} accounts
							</span>
						</div>
						<div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
							<span style={{ color: '#a78bfa' }}>Free Tier</span>
							<span className="font-bold text-white">
								{subscriptionBreakdown.filter(r => r.plan === 'free').reduce((s, r) => s + r._count.id, 0)} tenants
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* Growth Chart (simplified) */}
			<div className="rounded-xl p-6" style={cardStyle}>
				<h2 className="text-lg font-semibold text-white mb-4">New Paid Subscriptions (Last 12 Months)</h2>
				<div className="flex items-end gap-2 h-48">
					{monthlyNewSubscriptions.map((m, i) => {
						const maxCount = Math.max(...monthlyNewSubscriptions.map(x => x.count), 1);
						const height = (m.count / maxCount) * 100;
						return (
							<div key={i} className="flex-1 flex flex-col items-center">
								<div 
									className="w-full rounded-t transition-all hover:opacity-80"
									style={{ 
										height: `${Math.max(height, 2)}%`,
										background: 'linear-gradient(to top, #8b5cf6, #ec4899)',
									}}
									title={`${m.count} new subscriptions`}
								/>
								<span className="text-xs mt-2" style={{ color: '#64748b' }}>{m.label}</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function MetricCard({ 
	title, 
	value, 
	subtitle,
	highlight 
}: { 
	title: string; 
	value: string | number; 
	subtitle: string;
	highlight?: boolean;
}) {
	return (
		<div 
			className="rounded-xl p-5"
			style={{
				background: highlight 
					? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))'
					: 'rgba(139, 92, 246, 0.05)',
				border: highlight 
					? '1px solid rgba(139, 92, 246, 0.4)'
					: '1px solid rgba(139, 92, 246, 0.15)',
			}}
		>
			<div className="text-sm mb-2" style={{ color: '#a78bfa' }}>{title}</div>
			<div className="text-3xl font-bold text-white">{value}</div>
			<div className="text-xs mt-1" style={{ color: '#64748b' }}>{subtitle}</div>
		</div>
	);
}



