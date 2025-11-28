"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Get callback URL from query params, default to /admin
	const callbackUrl = searchParams.get("callbackUrl") || "/admin";

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const res = await signIn("credentials", {
				email,
				password,
				redirect: false,
				callbackUrl,
			});
			if (res?.error) {
				setError("Invalid credentials");
			} else {
				// Use the URL from response or fallback to callbackUrl
				router.push(res?.url || callbackUrl);
				router.refresh();
			}
		} catch {
			setError("Sign-in failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-6">
			{/* Background effects */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="glow-orb w-[500px] h-[500px] bg-indigo-600 -top-32 -left-32" />
				<div className="glow-orb w-[400px] h-[400px] bg-purple-600 bottom-0 right-0" />
			</div>

			<div className="relative w-full max-w-md">
				{/* Logo */}
				<div className="text-center mb-8">
					<Link href="/" className="text-2xl font-bold gradient-text">
						Stateless Forms
					</Link>
					<p className="text-slate-400 mt-2">Sign in to your account</p>
				</div>

				{/* Form card */}
				<div className="glass-card p-8">
					<form className="space-y-5" onSubmit={onSubmit}>
						<div>
							<label className="block text-sm text-slate-300 mb-2">Email address</label>
							<input
								type="email"
								className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="block text-sm text-slate-300 mb-2">Password</label>
							<input
								type="password"
								className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
						<button
							type="submit"
							disabled={loading}
							className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Signing in...
								</span>
							) : (
								"Sign in"
							)}
						</button>
						{error && (
							<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
								{error}
							</div>
						)}
					</form>
				</div>

				{/* Footer */}
				<p className="text-center text-slate-500 text-sm mt-6">
					Don&apos;t have an account?{" "}
					<Link href="/admin/forms/builder" className="text-indigo-400 hover:text-indigo-300 transition-colors">
						Start building for free
					</Link>
				</p>
			</div>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
				<div className="text-slate-400">Loading...</div>
			</div>
		}>
			<SignInForm />
		</Suspense>
	);
}
