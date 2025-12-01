"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignUpForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get("callbackUrl") || "/admin";

	const [orgName, setOrgName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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

		setLoading(true);

		try {
			const res = await fetch("/api/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ orgName, email, password }),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to create account");
			}

			// Redirect to sign in page with success message
			router.push(`/signin?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div 
			className="min-h-screen flex items-center justify-center px-4"
			style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
		>
			{/* Background effects */}
			<div 
				className="fixed top-1/4 -left-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
				style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
			/>
			<div 
				className="fixed bottom-1/4 -right-32 w-96 h-96 rounded-full opacity-20 blur-3xl"
				style={{ background: 'linear-gradient(to right, #8b5cf6, #6366f1)' }}
			/>

			<div className="w-full max-w-md relative z-10">
				{/* Logo */}
				<div className="text-center mb-8">
					<Link 
						href="/"
						className="text-2xl font-bold"
						style={{
							background: 'linear-gradient(to right, #818cf8, #a78bfa)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
						}}
					>
						Stateless Forms
					</Link>
					<p className="mt-2 text-sm" style={{ color: '#94a3b8' }}>
						Create your account to get started
					</p>
				</div>

				{/* Sign Up Card */}
				<div 
					className="rounded-2xl p-8"
					style={{ 
						background: 'rgba(255, 255, 255, 0.05)',
						border: '1px solid rgba(255, 255, 255, 0.1)',
						backdropFilter: 'blur(12px)',
					}}
				>
					<h1 className="text-xl font-semibold text-white mb-6">Create Account</h1>

					<form onSubmit={handleSubmit} className="space-y-5">
						<div>
							<label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
								Organization Name
							</label>
							<input
								type="text"
								value={orgName}
								onChange={(e) => setOrgName(e.target.value)}
								className="w-full rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2"
								style={{ 
									background: '#1e293b', 
									border: '1px solid #334155',
								}}
								placeholder="Acme Inc."
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
								Email Address
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2"
								style={{ 
									background: '#1e293b', 
									border: '1px solid #334155',
								}}
								placeholder="you@company.com"
								required
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
								Password
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2"
								style={{ 
									background: '#1e293b', 
									border: '1px solid #334155',
								}}
								placeholder="••••••••"
								required
								minLength={8}
							/>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1.5" style={{ color: '#94a3b8' }}>
								Confirm Password
							</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2"
								style={{ 
									background: '#1e293b', 
									border: '1px solid #334155',
								}}
								placeholder="••••••••"
								required
								minLength={8}
							/>
						</div>

						{error && (
							<div 
								className="rounded-lg p-3 text-sm"
								style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
							>
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="w-full rounded-full py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
							style={{ 
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
							}}
						>
							{loading ? "Creating Account..." : "Create Account"}
						</button>
					</form>

					<p className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>
						Already have an account?{" "}
						<Link href="/signin" style={{ color: '#818cf8' }} className="font-medium">
							Sign in
						</Link>
					</p>
				</div>

				{/* Terms */}
				<p className="mt-6 text-center text-xs" style={{ color: '#64748b' }}>
					By creating an account, you agree to our{" "}
					<Link href="/terms" style={{ color: '#818cf8' }}>Terms of Service</Link>
					{" "}and{" "}
					<Link href="/privacy" style={{ color: '#818cf8' }}>Privacy Policy</Link>
				</p>
			</div>
		</div>
	);
}

export default function SignUpPage() {
	return (
		<Suspense fallback={
			<div 
				className="min-h-screen flex items-center justify-center"
				style={{ background: '#0f172a', color: '#94a3b8' }}
			>
				Loading...
			</div>
		}>
			<SignUpForm />
		</Suspense>
	);
}

