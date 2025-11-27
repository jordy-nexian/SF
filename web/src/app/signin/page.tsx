"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await signIn("credentials", {
				email,
				password,
				redirect: false,
				callbackUrl: "/",
			});
			if (res?.error) {
				setError("Invalid credentials");
			} else {
				router.push(res?.url ?? "/");
				router.refresh();
			}
		} catch {
			setError("Sign-in failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="mx-auto max-w-sm p-6">
			<h1 className="mb-4 text-xl font-semibold">Sign in</h1>
			<form className="space-y-3" onSubmit={onSubmit}>
				<div>
					<label className="block text-sm">Email</label>
					<input
						type="email"
						className="w-full rounded border px-3 py-2"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</div>
				<div>
					<label className="block text-sm">Password</label>
					<input
						type="password"
						className="w-full rounded border px-3 py-2"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<button
					type="submit"
					disabled={loading}
					className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
				>
					{loading ? "Signing in…" : "Sign in"}
				</button>
				{error && <p className="text-sm text-red-600">{error}</p>}
			</form>
		</div>
	);
}


