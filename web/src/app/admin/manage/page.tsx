import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdministrator } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default async function AdminManagePage() {
	const session = await getServerSession(authOptions);
	if (!session) {
		redirect("/signin?callbackUrl=/admin/manage");
	}

	const role = (session.user?.role ?? "viewer") as "owner" | "admin" | "viewer";
	const isAdmin = isAdministrator(role);

	return (
		<div className="mx-auto max-w-4xl">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white">Admin</h1>
				<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
					Manage assignments and organization settings
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Assignments Card */}
				<Link
					href="/admin/manage/assignments"
					className="rounded-xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
					style={cardStyle}
				>
					<div className="flex items-center gap-3 mb-3">
						<div
							className="w-10 h-10 rounded-full flex items-center justify-center"
							style={{ background: 'rgba(99, 102, 241, 0.2)' }}
						>
							<svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
						</div>
						<h2 className="text-lg font-semibold text-white">Assignments</h2>
					</div>
					<p className="text-sm" style={{ color: '#94a3b8' }}>
						View and manage template assignments across all fund coordinators and team members.
					</p>
				</Link>

				{/* Settings Card — admin only */}
				{isAdmin && (
					<Link
						href="/admin/manage/settings"
						className="rounded-xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98]"
						style={cardStyle}
					>
						<div className="flex items-center gap-3 mb-3">
							<div
								className="w-10 h-10 rounded-full flex items-center justify-center"
								style={{ background: 'rgba(139, 92, 246, 0.2)' }}
							>
								<svg className="w-5 h-5" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<h2 className="text-lg font-semibold text-white">Settings</h2>
						</div>
						<p className="text-sm" style={{ color: '#94a3b8' }}>
							Configure organization name, webhook integrations, and security settings.
						</p>
					</Link>
				)}
			</div>
		</div>
	);
}
