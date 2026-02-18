import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
	const session = await getServerSession(authOptions);
	if (!session) {
		redirect(`/signin?callbackUrl=/admin`);
	}
	const userEmail = session.user?.email ?? "user";

	return (
		<div className="min-h-screen" style={{ background: '#0f172a' }}>
			<header style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)' }}>
				<div className="mx-auto flex max-w-6xl items-center justify-between p-4">
					<div className="flex items-center gap-6">
						<Link
							href="/"
							className="text-xl font-semibold"
							style={{
								background: 'linear-gradient(to right, #818cf8, #a78bfa)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
							}}
						>
							Stateless Forms
						</Link>
						<nav className="flex items-center gap-1 text-sm">
							<NavLink href="/admin">Forms</NavLink>
							<NavLink href="/admin/usage">Usage</NavLink>
							<NavLink href="/admin/customers">Customers</NavLink>
							<NavLink href="/admin/assignments">Assignments</NavLink>
							<NavLink href="/admin/wizard">Wizard</NavLink>
							<NavLink href="/admin/team">Team</NavLink>
							<NavLink href="/admin/themes">Themes</NavLink>
							<NavLink href="/admin/billing">Billing</NavLink>
							<NavLink href="/admin/settings">Settings</NavLink>
							<Link
								href="/admin/new"
								className="ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-[0.98] active:opacity-90"
								style={{
									background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
									color: 'white',
								}}
							>
								+ New Form
							</Link>
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm" style={{ color: '#64748b' }}>{userEmail}</span>
						<SignOutButton />
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-6xl p-6">{children}</main>
		</div>
	);
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link
			href={href}
			className="px-3 py-1.5 rounded-lg text-sm transition-colors"
			style={{ color: '#94a3b8' }}
		>
			{children}
		</Link>
	);
}
