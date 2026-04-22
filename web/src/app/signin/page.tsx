"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

const authBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";
const azureSsoEnabled = process.env.NEXT_PUBLIC_SSO_AZURE === "true";

function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const callbackUrl = searchParams.get("callbackUrl") || "/admin";
	const justRegistered = searchParams.get("registered") === "true";

	useEffect(() => {
		if (!authBypassEnabled) {
			return;
		}

		let cancelled = false;

		async function signInWithBypass() {
			setError(null);
			setLoading(true);
			try {
				const res = await signIn("credentials", {
					email: "bypass@example.com",
					password: "bypass",
					redirect: false,
					callbackUrl,
				});

				if (!cancelled) {
					if (res?.error) {
						setError("Temporary auth bypass failed");
					} else {
						router.push(res?.url || callbackUrl);
						router.refresh();
					}
				}
			} catch {
				if (!cancelled) {
					setError("Temporary auth bypass failed");
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void signInWithBypass();

		return () => {
			cancelled = true;
		};
	}, [callbackUrl, router]);

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
				router.push(res?.url || callbackUrl);
				router.refresh();
			}
		} catch {
			setError("Sign-in failed");
		} finally {
			setLoading(false);
		}
	}

	const gradientTextStyle = {
		background: 'linear-gradient(to right, #818cf8, #a78bfa)',
		WebkitBackgroundClip: 'text',
		WebkitTextFillColor: 'transparent',
		backgroundClip: 'text',
	} as React.CSSProperties;

	return (
		<div 
			className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden"
			style={{ background: '#0f172a' }}
		>
			{/* Background effects */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div 
					className="absolute rounded-full"
					style={{
						width: '500px',
						height: '500px',
						background: 'rgba(99, 102, 241, 0.3)',
						filter: 'blur(120px)',
						top: '-150px',
						left: '-150px',
					}}
				/>
				<div 
					className="absolute rounded-full"
					style={{
						width: '400px',
						height: '400px',
						background: 'rgba(139, 92, 246, 0.3)',
						filter: 'blur(120px)',
						bottom: '0',
						right: '0',
					}}
				/>
			</div>

			<div className="relative w-full max-w-md">
				{/* Logo */}
				<div className="text-center mb-8">
					<Link href="/" className="text-2xl font-bold" style={gradientTextStyle}>
						Stateless Forms
					</Link>
					<p className="mt-2" style={{ color: '#94a3b8' }}>Sign in to your account</p>
				</div>

				{/* Success message after registration */}
				{justRegistered && (
					<div 
						className="mb-6 rounded-xl p-4 text-center"
						style={{ 
							background: 'rgba(16, 185, 129, 0.1)',
							border: '1px solid rgba(16, 185, 129, 0.2)',
							color: '#10b981',
						}}
					>
						<p className="font-medium">Account created successfully!</p>
						<p className="text-sm mt-1" style={{ color: '#6ee7b7' }}>Please sign in with your credentials.</p>
					</div>
				)}

				{/* Form card */}
				<div 
					className="rounded-2xl p-8"
					style={{ 
						background: 'rgba(255, 255, 255, 0.05)',
						border: '1px solid rgba(255, 255, 255, 0.1)',
					}}
				>
					<form className="space-y-5" onSubmit={onSubmit}>
						{authBypassEnabled && (
							<div 
								className="rounded-lg p-3 text-sm text-center"
								style={{ 
									background: 'rgba(251, 191, 36, 0.1)',
									border: '1px solid rgba(251, 191, 36, 0.2)',
									color: '#fcd34d',
								}}
							>
								Temporary auth bypass is enabled. Signing you in automatically.
							</div>
						)}
						<div>
							<label className="block text-sm mb-2" style={{ color: '#cbd5e1' }}>Email address</label>
							<input
								type="email"
								className="w-full rounded-lg px-4 py-3 text-white transition-colors focus:outline-none"
								style={{ 
									background: '#1e293b',
									border: '1px solid #334155',
								}}
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={authBypassEnabled}
								required
							/>
						</div>
						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="block text-sm" style={{ color: '#cbd5e1' }}>Password</label>
								<Link 
									href="/forgot-password" 
									className="text-sm transition-colors hover:underline"
									style={{ color: '#818cf8' }}
								>
									Forgot password?
								</Link>
							</div>
							<input
								type="password"
								className="w-full rounded-lg px-4 py-3 text-white transition-colors focus:outline-none"
								style={{ 
									background: '#1e293b',
									border: '1px solid #334155',
								}}
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={authBypassEnabled}
								required
							/>
						</div>
						<button
							type="submit"
							disabled={loading || authBypassEnabled}
							className="w-full py-3 rounded-full font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.3)]"
							style={{
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
							}}
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
							<div
								className="p-3 rounded-lg text-sm text-center"
								style={{
									background: 'rgba(239, 68, 68, 0.1)',
									border: '1px solid rgba(239, 68, 68, 0.2)',
									color: '#f87171',
								}}
							>
								{error}
							</div>
						)}
					</form>

					{azureSsoEnabled && (
						<>
							<div className="my-6 flex items-center gap-3">
								<div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
								<span className="text-xs uppercase tracking-wider" style={{ color: '#64748b' }}>or</span>
								<div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
							</div>
							<button
								type="button"
								onClick={() => signIn('azure-ad', { callbackUrl })}
								disabled={loading}
								className="w-full py-3 rounded-full font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
								style={{
									background: 'rgba(255,255,255,0.05)',
									border: '1px solid rgba(255,255,255,0.1)',
									color: '#e2e8f0',
								}}
							>
								<svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
									<path fill="#f25022" d="M1 1h10v10H1z" />
									<path fill="#7fba00" d="M12 1h10v10H12z" />
									<path fill="#00a4ef" d="M1 12h10v10H1z" />
									<path fill="#ffb900" d="M12 12h10v10H12z" />
								</svg>
								Sign in with Microsoft
							</button>
						</>
					)}
				</div>

				{/* Footer */}
				<p className="text-center text-sm mt-6" style={{ color: '#64748b' }}>
					Don&apos;t have an account?{" "}
					<Link href="/signup" className="font-medium transition-colors" style={{ color: '#818cf8' }}>
						Create one for free
					</Link>
				</p>
			</div>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={
			<div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
				<div style={{ color: '#94a3b8' }}>Loading...</div>
			</div>
		}>
			<SignInForm />
		</Suspense>
	);
}
