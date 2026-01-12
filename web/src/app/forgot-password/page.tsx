"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const res = await fetch("/api/auth/forgot-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.message || "Something went wrong");
				return;
			}

			setIsSubmitted(true);
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	if (isSubmitted) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
				<div className="w-full max-w-md">
					<div className="text-center mb-8">
						<Link
							href="/"
							className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
						>
							Stateless Forms
						</Link>
					</div>

					<div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-xl">
						<div className="text-center">
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
								<svg
									className="w-8 h-8 text-emerald-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
									/>
								</svg>
							</div>

							<h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
							<p className="text-slate-400 mb-6">
								If an account exists for <strong className="text-slate-300">{email}</strong>, we've sent a password reset link.
							</p>

							<p className="text-sm text-slate-500 mb-6">
								The link will expire in 1 hour. Check your spam folder if you don't see it.
							</p>

							<Link
								href="/signin"
								className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
							>
								← Back to sign in
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<Link
						href="/"
						className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"
					>
						Stateless Forms
					</Link>
				</div>

				<div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-xl">
					<h1 className="text-2xl font-bold text-white mb-2">Forgot password?</h1>
					<p className="text-slate-400 mb-6">
						Enter your email and we'll send you a link to reset your password.
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
								Email address
							</label>
							<input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="you@example.com"
								required
								className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
						</div>

						{error && (
							<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={isLoading}
							className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Sending..." : "Send reset link"}
						</button>
					</form>

					<div className="mt-6 text-center">
						<Link
							href="/signin"
							className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
						>
							← Back to sign in
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
