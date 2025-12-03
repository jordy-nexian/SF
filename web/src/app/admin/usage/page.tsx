"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UsageWarning, UpgradeBadge } from "@/components/UpgradePrompt";

interface UsageData {
	plan: string;
	planName: string;
	subscriptionStatus: string;
	usage: {
		forms: number;
		submissionsThisMonth: number;
		teamMembers: number;
		customThemes: number;
	};
	limits: {
		forms: { current: number; limit: number; allowed: boolean };
		submissions: { current: number; limit: number; allowed: boolean };
		teamMembers: { current: number; limit: number; allowed: boolean };
		themes: { current: number; limit: number; allowed: boolean };
	};
	features: {
		webhookFailover: boolean;
		customDomain: boolean;
		abTesting: boolean;
		removeBranding: boolean;
		apiAccess: boolean;
	};
}

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function UsagePage() {
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/admin/billing/usage")
			.then(r => r.json())
			.then(setUsage)
			.finally(() => setLoading(false));
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		);
	}

	if (!usage) {
		return (
			<div className="text-center py-12" style={{ color: '#94a3b8' }}>
				Failed to load usage data
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-white">Usage Dashboard</h1>
					<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
						Monitor your usage and limits
					</p>
				</div>
				<div className="flex items-center gap-3">
					<span 
						className="px-3 py-1 rounded-full text-sm font-medium"
						style={{ 
							background: 'rgba(99, 102, 241, 0.2)',
							color: '#818cf8'
						}}
					>
						{usage.planName} Plan
					</span>
					{usage.plan !== 'enterprise' && (
						<Link
							href="/admin/billing"
							className="px-4 py-2 rounded-full text-sm font-medium text-white transition-all"
							style={{ 
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
							}}
						>
							Upgrade
						</Link>
					)}
				</div>
			</div>

			{/* Usage Warnings */}
			<div className="space-y-3 mb-8">
				<UsageWarning 
					current={usage.limits.forms.current} 
					limit={usage.limits.forms.limit} 
					type="forms" 
				/>
				<UsageWarning 
					current={usage.limits.submissions.current} 
					limit={usage.limits.submissions.limit} 
					type="submissions" 
				/>
				<UsageWarning 
					current={usage.limits.teamMembers.current} 
					limit={usage.limits.teamMembers.limit} 
					type="team members" 
				/>
			</div>

			{/* Usage Stats */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
				<UsageCard
					title="Forms"
					current={usage.limits.forms.current}
					limit={usage.limits.forms.limit}
					icon="📝"
				/>
				<UsageCard
					title="Submissions"
					current={usage.limits.submissions.current}
					limit={usage.limits.submissions.limit}
					icon="📬"
					subtitle="This month"
				/>
				<UsageCard
					title="Team Members"
					current={usage.limits.teamMembers.current}
					limit={usage.limits.teamMembers.limit}
					icon="👥"
				/>
				<UsageCard
					title="Custom Themes"
					current={usage.limits.themes.current}
					limit={usage.limits.themes.limit}
					icon="🎨"
				/>
			</div>

			{/* Features */}
			<div className="rounded-xl p-6" style={cardStyle}>
				<h2 className="text-lg font-semibold text-white mb-4">Features</h2>
				<div className="grid gap-4 md:grid-cols-2">
					<FeatureRow 
						name="A/B Testing" 
						available={usage.features.abTesting} 
						plan="Pro"
					/>
					<FeatureRow 
						name="Webhook Failover" 
						available={usage.features.webhookFailover} 
						plan="Pro"
					/>
					<FeatureRow 
						name="Remove Branding" 
						available={usage.features.removeBranding} 
						plan="Pro"
					/>
					<FeatureRow 
						name="API Access" 
						available={usage.features.apiAccess} 
						plan="Pro"
					/>
					<FeatureRow 
						name="Custom Domain" 
						available={usage.features.customDomain} 
						plan="Enterprise"
					/>
				</div>
			</div>

			{/* Quick Links */}
			<div className="mt-8 grid gap-4 md:grid-cols-3">
				<Link 
					href="/admin/billing"
					className="rounded-xl p-4 transition-all hover:scale-[1.02]"
					style={cardStyle}
				>
					<div className="text-2xl mb-2">💳</div>
					<div className="font-medium text-white">Billing</div>
					<div className="text-sm" style={{ color: '#64748b' }}>Manage subscription</div>
				</Link>
				<Link 
					href="/admin/team"
					className="rounded-xl p-4 transition-all hover:scale-[1.02]"
					style={cardStyle}
				>
					<div className="text-2xl mb-2">👥</div>
					<div className="font-medium text-white">Team</div>
					<div className="text-sm" style={{ color: '#64748b' }}>Invite members</div>
				</Link>
				<Link 
					href="/admin/forms/builder"
					className="rounded-xl p-4 transition-all hover:scale-[1.02]"
					style={cardStyle}
				>
					<div className="text-2xl mb-2">✨</div>
					<div className="font-medium text-white">New Form</div>
					<div className="text-sm" style={{ color: '#64748b' }}>Create a form</div>
				</Link>
			</div>
		</div>
	);
}

function UsageCard({ 
	title, 
	current, 
	limit, 
	icon,
	subtitle 
}: { 
	title: string; 
	current: number; 
	limit: number; 
	icon: string;
	subtitle?: string;
}) {
	const isUnlimited = limit === -1;
	const percentage = isUnlimited ? 0 : Math.min(100, Math.round((current / limit) * 100));
	const isNearLimit = percentage >= 80;
	const isAtLimit = percentage >= 100;

	return (
		<div className="rounded-xl p-4" style={cardStyle}>
			<div className="flex items-center gap-2 mb-3">
				<span className="text-xl">{icon}</span>
				<div>
					<div className="text-sm font-medium text-white">{title}</div>
					{subtitle && <div className="text-xs" style={{ color: '#64748b' }}>{subtitle}</div>}
				</div>
			</div>
			<div className="text-2xl font-bold text-white mb-2">
				{current.toLocaleString()}
				<span className="text-base font-normal" style={{ color: '#64748b' }}>
					{' '}/ {isUnlimited ? '∞' : limit.toLocaleString()}
				</span>
			</div>
			<div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
				<div 
					className="h-1.5 rounded-full transition-all"
					style={{ 
						width: isUnlimited ? '0%' : `${percentage}%`,
						background: isAtLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#6366f1'
					}}
				/>
			</div>
		</div>
	);
}

function FeatureRow({ 
	name, 
	available, 
	plan 
}: { 
	name: string; 
	available: boolean; 
	plan: string;
}) {
	return (
		<div className="flex items-center justify-between py-2">
			<span style={{ color: available ? '#cbd5e1' : '#64748b' }}>{name}</span>
			{available ? (
				<svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			) : (
				<UpgradeBadge plan={plan} />
			)}
		</div>
	);
}
