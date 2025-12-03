"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tenant {
	id: string;
	name: string;
	plan: string;
	subscriptionStatus: string;
	billingCycle: string;
	createdAt: string;
	_count: {
		users: number;
		forms: number;
	};
	usage: {
		submissionsThisMonth: number;
	};
}

const cardStyle = {
	background: 'rgba(139, 92, 246, 0.05)',
	border: '1px solid rgba(139, 92, 246, 0.15)',
};

export default function TenantsPage() {
	const [tenants, setTenants] = useState<Tenant[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [planFilter, setPlanFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");

	useEffect(() => {
		fetch("/api/platform/tenants")
			.then(r => r.json())
			.then(data => setTenants(data.tenants || []))
			.finally(() => setLoading(false));
	}, []);

	const filteredTenants = tenants.filter(t => {
		const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
		const matchesPlan = planFilter === "all" || t.plan === planFilter;
		const matchesStatus = statusFilter === "all" || t.subscriptionStatus === statusFilter;
		return matchesSearch && matchesPlan && matchesStatus;
	});

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#a78bfa' }}>
				Loading tenants...
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-white">Tenants</h1>
					<p className="mt-1 text-sm" style={{ color: '#a78bfa' }}>
						{tenants.length} total tenants
					</p>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-4 mb-6">
				<input
					type="text"
					placeholder="Search tenants..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="px-4 py-2 rounded-lg text-white w-64"
					style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
				/>
				<select
					value={planFilter}
					onChange={(e) => setPlanFilter(e.target.value)}
					className="px-4 py-2 rounded-lg text-white"
					style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
				>
					<option value="all">All Plans</option>
					<option value="free">Free</option>
					<option value="pro">Pro</option>
					<option value="enterprise">Enterprise</option>
				</select>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="px-4 py-2 rounded-lg text-white"
					style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
				>
					<option value="all">All Statuses</option>
					<option value="active">Active</option>
					<option value="none">No subscription</option>
					<option value="past_due">Past Due</option>
					<option value="canceled">Canceled</option>
				</select>
			</div>

			{/* Tenants Table */}
			<div className="rounded-xl overflow-hidden" style={cardStyle}>
				<table className="w-full">
					<thead style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
						<tr>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Tenant</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Plan</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Status</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Users</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Forms</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Submissions</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Created</th>
							<th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: '#a78bfa' }}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredTenants.map((tenant) => (
							<tr key={tenant.id} style={{ borderTop: '1px solid rgba(139, 92, 246, 0.1)' }}>
								<td className="px-4 py-3">
									<Link href={`/platform/tenants/${tenant.id}`} className="font-medium text-white hover:underline">
										{tenant.name}
									</Link>
								</td>
								<td className="px-4 py-3">
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
								</td>
								<td className="px-4 py-3">
									<span 
										className="px-2 py-0.5 rounded text-xs font-medium"
										style={{ 
											background: tenant.subscriptionStatus === 'active' ? 'rgba(16, 185, 129, 0.2)' 
												: tenant.subscriptionStatus === 'past_due' ? 'rgba(245, 158, 11, 0.2)'
												: 'rgba(100, 116, 139, 0.2)',
											color: tenant.subscriptionStatus === 'active' ? '#10b981' 
												: tenant.subscriptionStatus === 'past_due' ? '#f59e0b'
												: '#94a3b8'
										}}
									>
										{tenant.subscriptionStatus === 'none' ? 'Free' : tenant.subscriptionStatus}
									</span>
								</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#e9d5ff' }}>{tenant._count.users}</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#e9d5ff' }}>{tenant._count.forms}</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#e9d5ff' }}>{tenant.usage.submissionsThisMonth}</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
									{new Date(tenant.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<Link
										href={`/platform/tenants/${tenant.id}`}
										className="text-sm transition-colors"
										style={{ color: '#a78bfa' }}
									>
										Manage →
									</Link>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{filteredTenants.length === 0 && (
					<div className="p-8 text-center" style={{ color: '#64748b' }}>
						No tenants found
					</div>
				)}
			</div>
		</div>
	);
}

