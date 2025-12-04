"use client";

import { useState } from "react";
import Link from "next/link";

interface UpgradePromptProps {
	feature?: string;
	limitType?: "forms" | "submissions" | "teamMembers" | "themes";
	current?: number;
	limit?: number;
	onClose?: () => void;
}

export default function UpgradePrompt({ 
	feature, 
	limitType, 
	current, 
	limit,
	onClose 
}: UpgradePromptProps) {
	const [isVisible, setIsVisible] = useState(true);

	if (!isVisible) return null;

	const handleClose = () => {
		setIsVisible(false);
		onClose?.();
	};

	const getMessage = () => {
		if (feature) {
			return `${feature} is available on Pro and Enterprise plans.`;
		}
		if (limitType && current !== undefined && limit !== undefined) {
			const limitNames: Record<string, string> = {
				forms: "forms",
				submissions: "submissions this month",
				teamMembers: "team members",
				themes: "custom themes",
			};
			return `You've used ${current} of ${limit} ${limitNames[limitType]}. Upgrade for more.`;
		}
		return "Upgrade to unlock more features.";
	};

	return (
		<div 
			className="rounded-xl p-4 flex items-center justify-between"
			style={{ 
				background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
				border: '1px solid rgba(99, 102, 241, 0.2)',
			}}
		>
			<div className="flex items-center gap-3">
				<div 
					className="w-10 h-10 rounded-full flex items-center justify-center"
					style={{ background: 'rgba(99, 102, 241, 0.2)' }}
				>
					<svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<div>
					<p className="text-sm font-medium text-white">{getMessage()}</p>
					<p className="text-xs" style={{ color: '#94a3b8' }}>
						Get more forms, submissions, and premium features.
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Link
					href="/admin/billing"
					className="px-4 py-2 rounded-full text-sm font-medium text-white transition-all"
					style={{ 
						background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
						boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
					}}
				>
					Upgrade
				</Link>
				{onClose && (
					<button
						onClick={handleClose}
						className="p-2 rounded-full transition-colors"
						style={{ color: '#64748b' }}
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				)}
			</div>
		</div>
	);
}

// Inline upgrade badge for features
export function UpgradeBadge({ plan = "Pro" }: { plan?: string }) {
	return (
		<Link
			href="/admin/billing"
			className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
			style={{ 
				background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
				color: 'white',
			}}
		>
			<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
			</svg>
			{plan}
		</Link>
	);
}

// Usage warning banner
export function UsageWarning({ 
	current, 
	limit, 
	type 
}: { 
	current: number; 
	limit: number; 
	type: string;
}) {
	const percentage = Math.round((current / limit) * 100);
	
	if (percentage < 80) return null;

	const isAtLimit = percentage >= 100;

	return (
		<div 
			className="rounded-lg p-3 flex items-center gap-3"
			style={{ 
				background: isAtLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
				border: `1px solid ${isAtLimit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
			}}
		>
			<svg 
				className="w-5 h-5 flex-shrink-0" 
				style={{ color: isAtLimit ? '#f87171' : '#fbbf24' }} 
				fill="none" 
				stroke="currentColor" 
				viewBox="0 0 24 24"
			>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<div className="flex-1">
				<p className="text-sm font-medium" style={{ color: isAtLimit ? '#f87171' : '#fbbf24' }}>
					{isAtLimit 
						? `You've reached your ${type} limit` 
						: `You're approaching your ${type} limit`
					}
				</p>
				<p className="text-xs" style={{ color: '#94a3b8' }}>
					{current} of {limit} used ({percentage}%)
				</p>
			</div>
			<Link
				href="/admin/billing"
				className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
				style={{ 
					background: isAtLimit ? '#ef4444' : '#f59e0b',
					color: 'white',
				}}
			>
				Upgrade
			</Link>
		</div>
	);
}





