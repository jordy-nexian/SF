"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ImpersonateButton from "@/components/ImpersonateButton";

interface TenantDetail {
	id: string;
	name: string;
	plan: string;
	subscriptionStatus: string;
	billingCycle: string;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	paypalSubscriptionId: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	createdAt: string;
	users: Array<{
		id: string;
		email: string;
		role: string;
		createdAt: string;
	}>;
	forms: Array<{
		id: string;
		name: string;
		publicId: string;
		status: string;
		updatedAt: string;
	}>;
	usage: {
		forms: number;
		submissionsThisMonth: number;
		submissionsTotal: number;
	};
	recentSubmissions: Array<{
		id: string;
		formId: string;
		submittedAt: string;
		durationMs: number;
		formName: string;
	}>;
}

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

export default function TenantDetailPage() {
	const params = useParams();
	const router = useRouter();
	const tenantId = params.id as string;

	const [tenant, setTenant] = useState<TenantDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [newPlan, setNewPlan] = useState("");

	useEffect(() => {
		fetch(`/api/platform/tenants/${tenantId}`)
			.then(r => r.json())
			.then(data => {
				setTenant(data);
				setNewPlan(data?.plan || 'free');
			})
			.finally(() => setLoading(false));
	}, [tenantId]);

	async function handlePlanChange() {
		if (!tenant || newPlan === tenant.plan) return;
		
		if (!confirm(`Change plan from ${tenant.plan} to ${newPlan}?`)) return;
		
		setUpdating(true);
		try {
			const res = await fetch(`/api/platform/tenants/${tenantId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ plan: newPlan }),
			});
			
			if (res.ok) {
				const updated = await res.json();
				setTenant(updated);
				alert("Plan updated successfully");
			} else {
				const error = await res.json();
				alert(error.error || "Failed to update plan");
			}
		} finally {
			setUpdating(false);
		}
	}


	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#a78bfa' }}>
				Loading tenant...
			</div>
		);
	}

	if (!tenant) {
		return (
			<div className="text-center py-12">
				<h2 className="text-xl font-semibold text-white mb-2">Tenant not found</h2>
				<Link href="/platform/tenants" style={{ color: '#a78bfa' }}>← Back to tenants</Link>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<Link href="/platform/tenants" className="text-sm mb-2 inline-block" style={{ color: '#a78bfa' }}>
						← Back to tenants
					</Link>
					<h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
					<p className="mt-1 text-sm" style={{ color: '#64748b' }}>
						Created {new Date(tenant.createdAt).toLocaleDateString()}
					</p>
				</div>
				{tenant.users.length > 0 && (() => {
					const ownerUser = tenant.users.find(u => u.role === 'owner') || tenant.users[0];
					return (
						<ImpersonateButton
							userId={ownerUser.id}
							userEmail={ownerUser.email}
							tenantName={tenant.name}
						/>
					);
				})()}
			</div>

			<div className="grid gap-6 lg:grid-cols-3 mb-8">
				{/* Billing Card */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Billing</h2>
					<div className="space-y-4">
						<div>
							<label className="text-xs uppercase" style={{ color: '#a78bfa' }}>Current Plan</label>
							<div className="flex items-center gap-2 mt-1">
								<select
									value={newPlan}
									onChange={(e) => setNewPlan(e.target.value)}
									className="flex-1 px-3 py-2 rounded-lg text-white"
									style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
								>
									<option value="free">Free</option>
									<option value="pro">Pro ($29/mo)</option>
									<option value="enterprise">Enterprise ($99/mo)</option>
								</select>
								{newPlan !== tenant.plan && (
									<button
										onClick={handlePlanChange}
										disabled={updating}
										className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
										style={{ background: 'linear-gradient(to right, #8b5cf6, #ec4899)' }}
									>
										{updating ? "..." : "Update"}
									</button>
								)}
							</div>
						</div>
						<div>
							<label className="text-xs uppercase" style={{ color: '#a78bfa' }}>Status</label>
							<div className="mt-1">
								<span 
									className="px-2 py-1 rounded text-sm font-medium"
									style={{ 
										background: tenant.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.2)' 
											: 'rgba(100, 116, 139, 0.2)',
										color: tenant.subscriptionStatus === 'active' ? '#10b981' : '#94a3b8'
									}}
								>
									{tenant.subscriptionStatus === 'none' ? 'No subscription' : tenant.subscriptionStatus}
								</span>
							</div>
						</div>
						{tenant.currentPeriodEnd && (
							<div>
								<label className="text-xs uppercase" style={{ color: '#a78bfa' }}>
									{tenant.cancelAtPeriodEnd ? 'Cancels On' : 'Renews On'}
								</label>
								<div className="text-white mt-1">
									{new Date(tenant.currentPeriodEnd).toLocaleDateString()}
								</div>
							</div>
						)}
						{tenant.stripeCustomerId && (
							<div>
								<label className="text-xs uppercase" style={{ color: '#a78bfa' }}>Stripe Customer</label>
								<div className="text-white mt-1 font-mono text-sm">
									<a 
										href={`https://dashboard.stripe.com/customers/${tenant.stripeCustomerId}`}
										target="_blank"
										rel="noopener noreferrer"
										style={{ color: '#a78bfa' }}
									>
										{tenant.stripeCustomerId} →
									</a>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Usage Card */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Usage</h2>
					<div className="space-y-4">
						<div className="flex justify-between">
							<span style={{ color: '#a78bfa' }}>Forms</span>
							<span className="text-white font-medium">{tenant.usage.forms}</span>
						</div>
						<div className="flex justify-between">
							<span style={{ color: '#a78bfa' }}>Submissions (month)</span>
							<span className="text-white font-medium">{tenant.usage.submissionsThisMonth.toLocaleString()}</span>
						</div>
						<div className="flex justify-between">
							<span style={{ color: '#a78bfa' }}>Submissions (total)</span>
							<span className="text-white font-medium">{tenant.usage.submissionsTotal.toLocaleString()}</span>
						</div>
						<div className="flex justify-between">
							<span style={{ color: '#a78bfa' }}>Team Members</span>
							<span className="text-white font-medium">{tenant.users.length}</span>
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
					<div className="space-y-2">
						<button 
							className="w-full px-4 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
							style={{ color: '#e9d5ff' }}
							onClick={() => alert('Would send password reset email')}
						>
							📧 Send Password Reset
						</button>
						<button 
							className="w-full px-4 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
							style={{ color: '#e9d5ff' }}
							onClick={() => alert('Would export tenant data')}
						>
							📦 Export Data
						</button>
						<button 
							className="w-full px-4 py-2 rounded-lg text-sm text-left transition-colors hover:bg-white/5"
							style={{ color: '#f87171' }}
							onClick={() => {
								if (confirm('Are you sure you want to delete this tenant? This cannot be undone.')) {
									alert('Delete functionality would be implemented here');
								}
							}}
						>
							🗑️ Delete Tenant
						</button>
					</div>
				</div>
			</div>

			{/* Users & Forms */}
			<div className="grid gap-6 lg:grid-cols-2 mb-8">
				{/* Users */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Users ({tenant.users.length})</h2>
					<div className="space-y-2">
						{tenant.users.map((user) => (
							<div 
								key={user.id}
								className="flex items-center justify-between p-3 rounded-lg"
								style={{ background: 'rgba(139, 92, 246, 0.05)' }}
							>
								<div>
									<div className="text-white text-sm">{user.email}</div>
									<div className="text-xs" style={{ color: '#64748b' }}>
										{new Date(user.createdAt).toLocaleDateString()}
									</div>
								</div>
								<span 
									className="px-2 py-0.5 rounded text-xs capitalize"
									style={{ 
										background: user.role === 'owner' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(139, 92, 246, 0.2)',
										color: user.role === 'owner' ? '#f472b6' : '#a78bfa'
									}}
								>
									{user.role}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Forms */}
				<div className="rounded-xl p-6" style={cardStyle}>
					<h2 className="text-lg font-semibold text-white mb-4">Forms ({tenant.forms.length})</h2>
					<div className="space-y-2">
						{tenant.forms.slice(0, 5).map((form) => (
							<div 
								key={form.id}
								className="flex items-center justify-between p-3 rounded-lg"
								style={{ background: 'rgba(139, 92, 246, 0.05)' }}
							>
								<div>
									<div className="text-white text-sm">{form.name}</div>
									<div className="text-xs font-mono" style={{ color: '#64748b' }}>
										/{form.publicId}
									</div>
								</div>
								<span 
									className="px-2 py-0.5 rounded text-xs capitalize"
									style={{ 
										background: form.status === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
										color: form.status === 'live' ? '#10b981' : '#94a3b8'
									}}
								>
									{form.status}
								</span>
							</div>
						))}
						{tenant.forms.length > 5 && (
							<div className="text-center text-sm" style={{ color: '#64748b' }}>
								+{tenant.forms.length - 5} more forms
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="rounded-xl p-6" style={cardStyle}>
				<h2 className="text-lg font-semibold text-white mb-4">Recent Submissions</h2>
				<div className="space-y-2">
					{tenant.recentSubmissions.map((sub) => (
						<div 
							key={sub.id}
							className="flex items-center justify-between p-3 rounded-lg text-sm"
							style={{ background: 'rgba(139, 92, 246, 0.03)' }}
						>
							<span className="text-white">{sub.formName}</span>
							<div className="text-xs" style={{ color: '#64748b' }}>
								{sub.durationMs}ms · {new Date(sub.submittedAt).toLocaleString()}
							</div>
						</div>
					))}
					{tenant.recentSubmissions.length === 0 && (
						<div className="text-center py-4" style={{ color: '#64748b' }}>
							No submissions yet
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

