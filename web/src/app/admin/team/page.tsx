"use client";

import { useState, useEffect } from "react";
import { UsageWarning } from "@/components/UpgradePrompt";

interface TeamMember {
	id: string;
	email: string;
	role: string;
	createdAt: string;
}

interface UsageData {
	limits: {
		teamMembers: { current: number; limit: number };
	};
}

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function TeamPage() {
	const [members, setMembers] = useState<TeamMember[]>([]);
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [inviting, setInviting] = useState(false);
	const [showInvite, setShowInvite] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState("viewer");
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		Promise.all([
			fetch("/api/admin/team").then(r => r.json()),
			fetch("/api/admin/billing/usage").then(r => r.json()),
		])
			.then(([teamData, usageData]) => {
				setMembers(teamData.users || []);
				setUsage(usageData);
			})
			.finally(() => setLoading(false));
	}, []);

	async function handleInvite(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setInviting(true);

		try {
			const res = await fetch("/api/admin/team", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, role }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.error || "Failed to invite member");
				return;
			}

			setSuccess(`Invited ${email} successfully`);
			setEmail("");
			setShowInvite(false);

			// Refresh list
			const teamRes = await fetch("/api/admin/team");
			const teamData = await teamRes.json();
			setMembers(teamData.users || []);
		} catch {
			setError("Failed to invite member");
		} finally {
			setInviting(false);
		}
	}

	async function handleRemove(id: string) {
		if (!confirm("Are you sure you want to remove this team member?")) return;

		try {
			const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
			if (res.ok) {
				setMembers(members.filter(m => m.id !== id));
			}
		} catch {
			setError("Failed to remove member");
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading...
			</div>
		);
	}

	const canInvite = usage && (usage.limits.teamMembers.limit === -1 || usage.limits.teamMembers.current < usage.limits.teamMembers.limit);

	return (
		<div className="mx-auto max-w-4xl">
			<div className="flex items-center justify-between mb-8">
				<div>
					<h1 className="text-2xl font-bold text-white">Team</h1>
					<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
						Manage your organization's team members
					</p>
				</div>
				{canInvite && (
					<button
						onClick={() => setShowInvite(true)}
						className="px-4 py-2 rounded-full text-sm font-medium text-white transition-all"
						style={{ 
							background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
							boxShadow: '0 2px 10px rgba(99, 102, 241, 0.3)',
						}}
					>
						+ Invite Member
					</button>
				)}
			</div>

			{usage && (
				<div className="mb-6">
					<UsageWarning 
						current={usage.limits.teamMembers.current} 
						limit={usage.limits.teamMembers.limit} 
						type="team members" 
					/>
				</div>
			)}

			{error && (
				<div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
					<p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
				</div>
			)}

			{success && (
				<div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
					<p className="text-sm" style={{ color: '#10b981' }}>{success}</p>
				</div>
			)}

			{/* Invite Modal */}
			{showInvite && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="rounded-xl p-6 w-full max-w-md" style={cardStyle}>
						<h2 className="text-lg font-semibold text-white mb-4">Invite Team Member</h2>
						<form onSubmit={handleInvite} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
									Email
								</label>
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full px-3 py-2 rounded-lg text-white"
									style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
									placeholder="colleague@company.com"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
									Role
								</label>
								<select
									value={role}
									onChange={(e) => setRole(e.target.value)}
									className="w-full px-3 py-2 rounded-lg text-white"
									style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
								>
									<option value="viewer">Viewer - Can view and submit</option>
									<option value="admin">Admin - Can manage forms</option>
								</select>
							</div>
							<div className="flex gap-3 pt-2">
								<button
									type="button"
									onClick={() => setShowInvite(false)}
									className="flex-1 px-4 py-2 rounded-lg text-sm"
									style={{ border: '1px solid #334155', color: '#94a3b8' }}
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={inviting}
									className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
									style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
								>
									{inviting ? "Inviting..." : "Send Invite"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Team Members List */}
			<div className="rounded-xl overflow-hidden" style={cardStyle}>
				<table className="w-full">
					<thead style={{ background: 'rgba(255,255,255,0.03)' }}>
						<tr>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#64748b' }}>Email</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#64748b' }}>Role</th>
							<th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: '#64748b' }}>Joined</th>
							<th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: '#64748b' }}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{members.map((member) => (
							<tr key={member.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
								<td className="px-4 py-3 text-sm text-white">{member.email}</td>
								<td className="px-4 py-3">
									<span 
										className="px-2 py-0.5 rounded text-xs font-medium"
										style={{ 
											background: member.role === 'owner' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(99, 102, 241, 0.2)',
											color: member.role === 'owner' ? '#a78bfa' : '#818cf8'
										}}
									>
										{member.role}
									</span>
								</td>
								<td className="px-4 py-3 text-sm" style={{ color: '#64748b' }}>
									{new Date(member.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									{member.role !== 'owner' && (
										<button
											onClick={() => handleRemove(member.id)}
											className="text-sm transition-colors"
											style={{ color: '#f87171' }}
										>
											Remove
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

