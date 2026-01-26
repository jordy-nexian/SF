'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BrandingSettings {
    portalTitle: string;
    portalLogoUrl: string | null;
    portalPrimaryColor: string;
}

export default function BrandingSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [branding, setBranding] = useState<BrandingSettings>({
        portalTitle: '',
        portalLogoUrl: null,
        portalPrimaryColor: '#6366f1',
    });

    useEffect(() => {
        fetchBranding();
    }, []);

    async function fetchBranding() {
        try {
            const res = await fetch('/api/admin/branding');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setBranding(data.branding);
        } catch (err) {
            setError('Failed to load branding settings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/branding', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(branding),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save');
            }

            setBranding(data.branding);
            setSuccess('Branding settings saved successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
                <Link
                    href="/admin/settings"
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Portal Branding</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Customize how your customer portal looks.
                    </p>
                </div>
            </div>

            <div
                className="rounded-xl p-8"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Portal Title
                        </label>
                        <input
                            type="text"
                            value={branding.portalTitle}
                            onChange={(e) => setBranding({ ...branding, portalTitle: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="Your Company Name"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Shown in the portal header and emails.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Logo URL
                        </label>
                        <input
                            type="url"
                            value={branding.portalLogoUrl || ''}
                            onChange={(e) => setBranding({ ...branding, portalLogoUrl: e.target.value || null })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="https://example.com/logo.png"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            URL to your logo image (PNG, JPG, or SVG). Recommended size: 200x50px.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Primary Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={branding.portalPrimaryColor}
                                onChange={(e) => setBranding({ ...branding, portalPrimaryColor: e.target.value })}
                                className="w-12 h-10 rounded border border-slate-700 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={branding.portalPrimaryColor}
                                onChange={(e) => setBranding({ ...branding, portalPrimaryColor: e.target.value })}
                                className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono"
                                placeholder="#6366f1"
                                pattern="^#[0-9A-Fa-f]{6}$"
                            />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            Used for buttons and accents in the portal.
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="pt-4 border-t border-white/10">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Preview
                        </label>
                        <div
                            className="rounded-lg p-4 border border-white/10"
                            style={{ background: 'rgba(15, 23, 42, 0.8)' }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                {branding.portalLogoUrl ? (
                                    <img
                                        src={branding.portalLogoUrl}
                                        alt="Logo"
                                        className="h-8 object-contain"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                                        style={{ background: branding.portalPrimaryColor }}
                                    >
                                        {branding.portalTitle.charAt(0).toUpperCase() || 'P'}
                                    </div>
                                )}
                                <span className="text-white font-semibold">
                                    {branding.portalTitle || 'Your Portal'}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                                style={{ background: branding.portalPrimaryColor }}
                            >
                                Sample Button
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
