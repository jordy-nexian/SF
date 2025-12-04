"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type BillingCycle = "monthly" | "annual";

interface PlanData {
	id: string;
	name: string;
	description: string;
	popular?: boolean;
	pricing: {
		monthly: number;
		annual: number;
		annualTotal: number;
		savings: number;
	};
	features: string[];
}

interface UsageData {
	plan: string;
	planName: string;
	subscriptionStatus: string;
	billingCycle: string;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	usage: {
		forms: number;
		submissionsThisMonth: number;
		teamMembers: number;
		customThemes: number;
	};
	limits: {
		forms: { current: number; limit: number };
		submissions: { current: number; limit: number };
		teamMembers: { current: number; limit: number };
		themes: { current: number; limit: number };
	};
}

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function BillingPage() {
	const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
	const [plans, setPlans] = useState<PlanData[]>([]);
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [upgrading, setUpgrading] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			fetch("/api/admin/billing/plans").then(r => r.json()),
			fetch("/api/admin/billing/usage").then(r => r.json()),
		])
			.then(([plansData, usageData]) => {
				setPlans(plansData.plans || []);
				setUsage(usageData);
			})
			.finally(() => setLoading(false));
	}, []);

	async function handleUpgrade(planId: string, provider: "stripe" | "paypal") {
		setUpgrading(planId);
		try {
			const res = await fetch("/api/admin/billing/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ planId, billingCycle, provider }),
			});
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			} else {
				alert(data.error || "Failed to start checkout");
			}
		} catch {
			alert("Failed to start checkout");
		} finally {
			setUpgrading(null);
		}
	}

	async function handleManageSubscription() {
		try {
			const res = await fetch("/api/admin/billing/portal", { method: "POST" });
			const data = await res.json();
			if (data.url) {
				window.location.href = data.url;
			}
		} catch {
			alert("Failed to open billing portal");
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
				<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
					Manage your subscription and view usage
				</p>
			</div>

			{/* Current Plan & Usage */}
			{usage && (
				<div className="mb-8 grid gap-6 md:grid-cols-2">
					{/* Current Plan */}
					<div className="rounded-xl p-6" style={cardStyle}>
						<h2 className="text-sm font-medium mb-4" style={{ color: '#94a3b8' }}>Current Plan</h2>
						<div className="flex items-center justify-between mb-4">
							<div>
								<div className="text-2xl font-bold text-white">{usage.planName}</div>
								{usage.subscriptionStatus === 'active' && (
									<div className="text-sm" style={{ color: '#64748b' }}>
										{usage.billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
									</div>
								)}
							</div>
							<span 
								className="px-3 py-1 rounded-full text-xs font-medium"
								style={{ 
									background: usage.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
									color: usage.subscriptionStatus === 'active' ? '#10b981' : '#eab308'
								}}
							>
								{usage.subscriptionStatus === 'active' ? 'Active' : usage.plan === 'free' ? 'Free' : usage.subscriptionStatus}
							</span>
						</div>
						{usage.currentPeriodEnd && (
							<p className="text-sm" style={{ color: '#64748b' }}>
								{usage.cancelAtPeriodEnd 
									? `Cancels on ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`
									: `Renews on ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`
								}
							</p>
						)}
						{usage.plan !== 'free' && (
							<button
								onClick={handleManageSubscription}
								className="mt-4 text-sm transition-colors"
								style={{ color: '#818cf8' }}
							>
								Manage subscription →
							</button>
						)}
					</div>

					{/* Usage Stats */}
					<div className="rounded-xl p-6" style={cardStyle}>
						<h2 className="text-sm font-medium mb-4" style={{ color: '#94a3b8' }}>Usage This Month</h2>
						<div className="space-y-4">
							<UsageBar 
								label="Forms" 
								current={usage.limits.forms.current} 
								limit={usage.limits.forms.limit} 
							/>
							<UsageBar 
								label="Submissions" 
								current={usage.limits.submissions.current} 
								limit={usage.limits.submissions.limit} 
							/>
							<UsageBar 
								label="Team Members" 
								current={usage.limits.teamMembers.current} 
								limit={usage.limits.teamMembers.limit} 
							/>
						</div>
					</div>
				</div>
			)}

			{/* Billing Cycle Toggle */}
			<div className="flex justify-center mb-8">
				<div 
					className="inline-flex rounded-full p-1"
					style={{ background: 'rgba(255, 255, 255, 0.05)' }}
				>
					<button
						onClick={() => setBillingCycle("monthly")}
						className="px-6 py-2 rounded-full text-sm font-medium transition-all"
						style={{
							background: billingCycle === "monthly" ? 'linear-gradient(to right, #6366f1, #8b5cf6)' : 'transparent',
							color: billingCycle === "monthly" ? 'white' : '#94a3b8',
						}}
					>
						Monthly
					</button>
					<button
						onClick={() => setBillingCycle("annual")}
						className="px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
						style={{
							background: billingCycle === "annual" ? 'linear-gradient(to right, #6366f1, #8b5cf6)' : 'transparent',
							color: billingCycle === "annual" ? 'white' : '#94a3b8',
						}}
					>
						Annual
						<span 
							className="px-2 py-0.5 rounded-full text-xs"
							style={{ 
								background: billingCycle === "annual" ? 'rgba(255,255,255,0.2)' : 'rgba(16, 185, 129, 0.2)',
								color: billingCycle === "annual" ? 'white' : '#10b981'
							}}
						>
							Save 17%
						</span>
					</button>
				</div>
			</div>

			{/* Plan Cards */}
			<div className="grid gap-6 md:grid-cols-3">
				{plans.map((plan) => (
					<div 
						key={plan.id}
						className="relative rounded-xl p-6 flex flex-col"
						style={{
							...cardStyle,
							border: plan.popular ? '2px solid #6366f1' : cardStyle.border,
						}}
					>
						{plan.popular && (
							<div 
								className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium"
								style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)', color: 'white' }}
							>
								Most Popular
							</div>
						)}

						<div className="mb-4">
							<h3 className="text-lg font-semibold text-white">{plan.name}</h3>
							<p className="text-sm" style={{ color: '#64748b' }}>{plan.description}</p>
						</div>

						<div className="mb-6">
							<div className="flex items-baseline gap-1">
								<span className="text-4xl font-bold text-white">
									${billingCycle === "monthly" ? plan.pricing.monthly : plan.pricing.annual}
								</span>
								<span style={{ color: '#64748b' }}>/mo</span>
							</div>
							{billingCycle === "annual" && plan.pricing.savings > 0 && (
								<p className="text-sm mt-1" style={{ color: '#10b981' }}>
									${plan.pricing.annualTotal}/year (save ${plan.pricing.monthly * 12 - plan.pricing.annualTotal})
								</p>
							)}
						</div>

						<ul className="space-y-3 mb-6 flex-1">
							{plan.features.map((feature, i) => (
								<li key={i} className="flex items-start gap-2 text-sm">
									<svg className="w-5 h-5 flex-shrink-0" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
									</svg>
									<span style={{ color: '#cbd5e1' }}>{feature}</span>
								</li>
							))}
						</ul>

						{usage?.plan === plan.id ? (
							<button
								disabled
								className="w-full py-3 rounded-full text-sm font-medium"
								style={{ background: 'rgba(255,255,255,0.1)', color: '#64748b' }}
							>
								Current Plan
							</button>
						) : plan.id === 'free' ? (
							<button
								disabled
								className="w-full py-3 rounded-full text-sm font-medium"
								style={{ border: '1px solid #334155', color: '#64748b' }}
							>
								Free Forever
							</button>
						) : (
							<div className="space-y-2">
								<button
									onClick={() => handleUpgrade(plan.id, "stripe")}
									disabled={upgrading === plan.id}
									className="w-full py-3 rounded-full text-sm font-medium text-white transition-all disabled:opacity-50"
									style={{ 
										background: plan.popular 
											? 'linear-gradient(to right, #6366f1, #8b5cf6)' 
											: 'rgba(255,255,255,0.1)',
										boxShadow: plan.popular ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
									}}
								>
									{upgrading === plan.id ? "Processing..." : "Upgrade with Card"}
								</button>
								<button
									onClick={() => handleUpgrade(plan.id, "paypal")}
									disabled={upgrading === plan.id}
									className="w-full py-2.5 rounded-full text-sm font-medium transition-all disabled:opacity-50"
									style={{ border: '1px solid #334155', color: '#94a3b8' }}
								>
									Pay with PayPal
								</button>
							</div>
						)}
					</div>
				))}
			</div>

			{/* FAQ or Contact */}
			<div className="mt-12 text-center">
				<p style={{ color: '#64748b' }}>
					Need a custom plan or have questions?{" "}
					<Link href="mailto:support@statelessforms.com" style={{ color: '#818cf8' }}>
						Contact us
					</Link>
				</p>
			</div>
		</div>
	);
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
	const isUnlimited = limit === -1;
	const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
	const isNearLimit = percentage >= 80;

	return (
		<div>
			<div className="flex justify-between text-sm mb-1">
				<span style={{ color: '#cbd5e1' }}>{label}</span>
				<span style={{ color: '#64748b' }}>
					{current.toLocaleString()} / {isUnlimited ? '∞' : limit.toLocaleString()}
				</span>
			</div>
			<div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
				<div 
					className="h-2 rounded-full transition-all"
					style={{ 
						width: isUnlimited ? '0%' : `${percentage}%`,
						background: isNearLimit ? '#f59e0b' : '#6366f1'
					}}
				/>
			</div>
		</div>
	);
}



