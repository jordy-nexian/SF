"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
	return (
		<button
			onClick={() => signOut({ callbackUrl: "/" })}
			className="rounded border px-3 py-1 text-sm"
		>
			Sign out
		</button>
	);
}



