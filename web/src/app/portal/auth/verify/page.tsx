'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            verifyToken(token);
        } else {
            setStatus('error');
            setError('No token provided');
        }
    }, [searchParams]);

    async function verifyToken(token: string) {
        try {
            const res = await fetch('/api/portal/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            setStatus('success');

            // Redirect to dashboard after brief delay
            setTimeout(() => {
                router.push('/portal/dashboard');
            }, 1500);
        } catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'Verification failed');
        }
    }

    if (status === 'verifying') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Verifying your link...</h1>
                    <p className="text-white/70">Please wait while we sign you in.</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">You're signed in!</h1>
                    <p className="text-white/70">Redirecting to your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-md">
                <div className="mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Verification failed</h1>
                <p className="text-white/70 mb-6">{error}</p>
                <button
                    onClick={() => router.push('/portal')}
                    className="px-6 py-3 rounded-xl font-semibold text-white
						bg-gradient-to-r from-indigo-500 to-purple-600 
						hover:from-indigo-600 hover:to-purple-700
						transition-all duration-200"
                >
                    Request a new link
                </button>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-pulse text-white/60">Loading...</div>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
