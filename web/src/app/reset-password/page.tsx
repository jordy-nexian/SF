"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [isValidToken, setIsValidToken] = useState(false);
	const [tokenError, setTokenError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	// Validate token on mount
	useEffect(() => {
		async function validateToken() {
			if (!token) {
				setTokenError("No reset token provided");
				setIsValidating(false);
				return;
			}

			try {
				const res = await fetch(`/api/auth/reset-password?token=${token}`);
				const data = await res.json();

				if (data.valid) {
					setIsValidToken(true);
				} else {
					setTokenError(data.message || "Invalid reset link");
				}
			} catch {
				setTokenError("Failed to validate reset link");
			} finally {
				setIsValidating(false);
			}
		}

		validateToken();
	}, [token]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setIsLoading(true);

		try {
			const res = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(data.message || "Something went wrong");
				return;
			}

			setIsSuccess(true);
			// Redirect to sign in after 3 seconds
			setTimeout(() => router.push("/signin"), 3000);
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	// Loading state while validating token
	if (isValidating) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
				<div className="w-full max-w-md">
					<div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-xl">
						<div className="flex items-center justify-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
							<span className="ml-3 text-slate-400">Validating reset link...</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Invalid token state
	if (tokenError) {
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
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
								<svg
									className="w-8 h-8 text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>

							<h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
							<p className="text-slate-400 mb-6">{tokenError}</p>

							<Link
								href="/forgot-password"
								className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
							>
								Request a new reset link
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Success state
	if (isSuccess) {
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
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>

							<h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
							<p className="text-slate-400 mb-6">
								Your password has been successfully reset. Redirecting you to sign in...
							</p>

							<Link
								href="/signin"
								className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
							>
								Sign in now →
							</Link>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Reset form
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
					<h1 className="text-2xl font-bold text-white mb-2">Create new password</h1>
					<p className="text-slate-400 mb-6">
						Enter a new password for your account.
					</p>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
								New password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter new password"
								required
								minLength={8}
								className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
							/>
							<p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
						</div>

						<div>
							<label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
								Confirm password
							</label>
							<input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="Confirm new password"
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
							{isLoading ? "Resetting..." : "Reset password"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
				</div>
			}
		>
			<ResetPasswordForm />
		</Suspense>
	);
}
