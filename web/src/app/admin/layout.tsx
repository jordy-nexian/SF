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
		<div className="min-h-screen bg-gray-50 text-gray-900">
			<header className="border-b bg-white">
				<div className="mx-auto flex max-w-6xl items-center justify-between p-4">
					<div className="flex items-center gap-4">
						<Link href="/admin" className="text-xl font-semibold">Form Admin</Link>
						<nav className="flex items-center gap-4 text-sm text-gray-700">
							<Link href="/admin">Forms</Link>
							<Link href="/admin/forms/new" className="text-blue-600">+ New form</Link>
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-gray-600">{userEmail}</span>
						<SignOutButton />
					</div>
				</div>
			</header>
			<main className="mx-auto max-width[72rem] p-6">{children}</main>
		</div>
	);
}


