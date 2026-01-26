'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PortalUser {
    id: string;
    email: string;
    name?: string;
    tenantId: string;
}

interface PortalLayoutProps {
    children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
    const router = useRouter();
    const [user, setUser] = useState<PortalUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        try {
            const res = await fetch('/api/portal/auth/session');
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated) {
                    setUser(data.user);
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        try {
            await fetch('/api/portal/auth/session', { method: 'DELETE' });
            setUser(null);
            router.push('/portal');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-pulse text-white/60">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Portal Header */}
            <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <span className="text-lg font-semibold text-white">Forms Portal</span>
                    </div>

                    {user && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-white/70">{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-white/60 hover:text-white transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
