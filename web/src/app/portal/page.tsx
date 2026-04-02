'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PortalLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tenantId = searchParams.get('tenant');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/portal/auth/request-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, ...(tenantId && { tenantId }) }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send magic link');
            }

            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="max-w-md w-full text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
                    <p className="text-white/70 mb-6">
                        We sent a magic link to <span className="text-white font-medium">{email}</span>.
                        Click the link in the email to sign in to your portal.
                    </p>
                    <p className="text-sm text-white/50">
                        Didn't receive it? Check your spam folder or{' '}
                        <button
                            onClick={() => setSent(false)}
                            className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                            try again
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-3">Welcome to your portal</h1>
                    <p className="text-white/70">
                        Enter your email to receive a magic link and access your forms.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                            Email address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white 
								placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
								transition-all"
                            placeholder="you@company.com"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-xl font-semibold text-white
							bg-gradient-to-r from-indigo-500 to-purple-600 
							hover:from-indigo-600 hover:to-purple-700
							focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900
							disabled:opacity-50 disabled:cursor-not-allowed
							transition-all duration-200"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Sending...
                            </span>
                        ) : (
                            'Send magic link'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
