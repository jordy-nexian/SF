"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
	return (
		<button
			onClick={() => signOut({ callbackUrl: "/" })}
			className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
			style={{
				border: '1px solid #334155',
				color: '#cbd5e1',
				background: 'transparent',
			}}
		>
			Sign out
		</button>
	);
}
