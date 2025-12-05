import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPlatformSession } from "@/lib/platform-auth";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
	const session = await getPlatformSession();
	
	if (!session) {
		redirect("/signin?error=unauthorized&callbackUrl=/platform");
	}

	return (
		<div className="min-h-screen" style={{ background: '#0a0a0f' }}>
			<header style={{ 
				borderBottom: '1px solid rgba(139, 92, 246, 0.2)', 
				background: 'rgba(10, 10, 15, 0.95)', 
				backdropFilter: 'blur(12px)' 
			}}>
				<div className="mx-auto flex max-w-7xl items-center justify-between p-4">
					<div className="flex items-center gap-6">
						<Link 
							href="/platform" 
							className="flex items-center gap-2 text-xl font-semibold"
						>
							<span 
								className="px-2 py-0.5 rounded text-xs font-bold"
								style={{ background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white' }}
							>
								PLATFORM
							</span>
							<span
								style={{
									background: 'linear-gradient(to right, #a78bfa, #f472b6)',
									WebkitBackgroundClip: 'text',
									WebkitTextFillColor: 'transparent',
								}}
							>
								Admin Console
							</span>
						</Link>
						<nav className="flex items-center gap-1 text-sm">
							<NavLink href="/platform">Dashboard</NavLink>
							<NavLink href="/platform/tenants">Tenants</NavLink>
							<NavLink href="/platform/users">Users</NavLink>
							<NavLink href="/platform/revenue">Revenue</NavLink>
							<NavLink href="/platform/activity">Activity</NavLink>
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm" style={{ color: '#a78bfa' }}>{session.email}</span>
						<SignOutButton />
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-7xl p-6">{children}</main>
		</div>
	);
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link 
			href={href} 
			className="px-3 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/5"
			style={{ color: '#c4b5fd' }}
		>
			{children}
		</Link>
	);
}






