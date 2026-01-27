'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PortalUser {
    id: string;
    email: string;
    name?: string;
    tenantId: string;
}

interface Branding {
    portalTitle: string;
    portalLogoUrl: string | null;
    portalPrimaryColor: string;
}

interface PortalLayoutProps {
    children: React.ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
    const router = useRouter();
    const [user, setUser] = useState<PortalUser | null>(null);
    const [branding, setBranding] = useState<Branding>({
        portalTitle: 'Forms Portal',
        portalLogoUrl: null,
        portalPrimaryColor: '#6366f1',
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
        fetchBranding();
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

    async function fetchBranding() {
        try {
            const res = await fetch('/api/portal/branding');
            if (res.ok) {
                const data = await res.json();
                setBranding(data.branding);
            }
        } catch (error) {
            console.error('Branding fetch failed:', error);
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f172a' }}>
                <div className="animate-pulse text-white/60">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: '#0f172a' }}>
            {/* Portal Header */}
            <header style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)' }}>
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {branding.portalLogoUrl ? (
                            <img
                                src={branding.portalLogoUrl}
                                alt={branding.portalTitle}
                                className="h-8 object-contain"
                            />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ background: branding.portalPrimaryColor }}
                            >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                        )}
                        <span className="text-lg font-semibold text-white">{branding.portalTitle}</span>
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

            {/* Custom CSS variables for branding */}
            <style jsx global>{`
				:root {
					--portal-primary: ${branding.portalPrimaryColor};
				}
				.portal-btn-primary {
					background: ${branding.portalPrimaryColor};
				}
				.portal-btn-primary:hover {
					filter: brightness(1.1);
				}
			`}</style>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    );
}
