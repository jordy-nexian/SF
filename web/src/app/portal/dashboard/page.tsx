'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    DashboardSummary,
    DashboardSkeleton,
} from './components';

interface FormAssignment {
    assignmentId: string;
    formId: string;
    publicId: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: string | null;
    completedAt: string | null;
    createdAt: string;
}

type SortKey = 'name' | 'status' | 'dueDate' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_ORDER = { pending: 0, in_progress: 1, completed: 2 };
const STATUS_CONFIG = {
    pending: { label: 'Not Started', dot: 'bg-slate-400', badge: 'bg-slate-500/20 text-slate-300' },
    in_progress: { label: 'In Progress', dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
    completed: { label: 'Completed', dot: 'bg-green-400', badge: 'bg-green-500/20 text-green-300' },
};

export default function PortalDashboard() {
    const router = useRouter();
    const [forms, setForms] = useState<FormAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('status');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    useEffect(() => {
        fetchForms();
    }, []);

    async function fetchForms() {
        try {
            const res = await fetch('/api/portal/forms');
            if (res.status === 401) { router.push('/portal'); return; }
            if (!res.ok) throw new Error('Failed to fetch forms');
            const data = await res.json();
            setForms(data.forms);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    function handleFormOpened(formId: string) {
        setForms(prev => prev.map(f =>
            f.formId === formId && f.status === 'pending'
                ? { ...f, status: 'in_progress' as const }
                : f
        ));
    }

    const stats = useMemo(() => {
        const completed = forms.filter(f => f.status === 'completed').length;
        const inProgress = forms.filter(f => f.status === 'in_progress').length;
        const notStarted = forms.filter(f => f.status === 'pending').length;
        return { completed, inProgress, notStarted, total: forms.length };
    }, [forms]);

    const nextForm = useMemo(() => {
        const now = new Date();
        const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const active = forms.filter(f => f.status !== 'completed');
        // Priority: due soon > in_progress > pending
        const dueSoon = active.filter(f => f.dueDate && new Date(f.dueDate) <= soon)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        if (dueSoon.length > 0) return dueSoon[0];
        const ip = active.find(f => f.status === 'in_progress');
        if (ip) return ip;
        return active[0] || null;
    }, [forms]);

    // Sorting
    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }

    const sorted = useMemo(() => {
        const arr = [...forms];
        const dir = sortDir === 'asc' ? 1 : -1;
        arr.sort((a, b) => {
            switch (sortKey) {
                case 'name':
                    return dir * a.name.localeCompare(b.name);
                case 'status':
                    return dir * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
                case 'dueDate': {
                    const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    return dir * (da - db);
                }
                case 'createdAt':
                    return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                default:
                    return 0;
            }
        });
        return arr;
    }, [forms, sortKey, sortDir]);

    async function handleOpen(form: FormAssignment) {
        if (form.status === 'pending') {
            try {
                await fetch(`/api/portal/forms/${form.formId}/start`, { method: 'POST' });
                handleFormOpened(form.formId);
            } catch { /* best-effort */ }
        }
        router.push(`/f/${form.publicId}`);
    }

    function formatDate(d: string | null) {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function getUrgencyBadge(form: FormAssignment) {
        if (!form.dueDate || form.status === 'completed') return null;
        const days = Math.ceil((new Date(form.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">Overdue</span>;
        if (days <= 3) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">Due soon</span>;
        return null;
    }

    // Loading
    if (loading) return <DashboardSkeleton />;

    // Error
    if (error) {
        return (
            <div className="text-center py-12" role="alert">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-red-400 mb-4 text-lg">{error}</p>
                <button
                    onClick={() => { setError(''); setLoading(true); fetchForms(); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Empty
    if (forms.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">No forms assigned yet</h2>
                <p className="text-white/70">When forms are assigned to you, they&apos;ll appear here.</p>
            </div>
        );
    }

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span className="text-slate-600 ml-1">&#8597;</span>;
        return <span className="text-indigo-400 ml-1">{sortDir === 'asc' ? '&#8593;' : '&#8595;'}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <DashboardSummary
                stats={stats}
                nextForm={nextForm ? {
                    id: nextForm.formId,
                    publicId: nextForm.publicId,
                    name: nextForm.name,
                    status: nextForm.status as 'pending' | 'in_progress',
                } : null}
                onStartForm={(formId, publicId) => {
                    const f = forms.find(x => x.formId === formId);
                    if (f) handleOpen(f);
                    else router.push(`/f/${publicId}`);
                }}
            />

            {/* Assignments Table */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th
                                className="px-5 py-3 font-medium cursor-pointer select-none"
                                style={{ color: '#94a3b8' }}
                                onClick={() => toggleSort('name')}
                            >
                                Form <SortIcon col="name" />
                            </th>
                            <th
                                className="px-5 py-3 font-medium cursor-pointer select-none"
                                style={{ color: '#94a3b8' }}
                                onClick={() => toggleSort('status')}
                            >
                                Status <SortIcon col="status" />
                            </th>
                            <th
                                className="px-5 py-3 font-medium cursor-pointer select-none hidden sm:table-cell"
                                style={{ color: '#94a3b8' }}
                                onClick={() => toggleSort('dueDate')}
                            >
                                Due Date <SortIcon col="dueDate" />
                            </th>
                            <th
                                className="px-5 py-3 font-medium cursor-pointer select-none hidden md:table-cell"
                                style={{ color: '#94a3b8' }}
                                onClick={() => toggleSort('createdAt')}
                            >
                                Assigned <SortIcon col="createdAt" />
                            </th>
                            <th className="px-5 py-3 font-medium text-right" style={{ color: '#94a3b8' }}>
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((form) => {
                            const sc = STATUS_CONFIG[form.status];
                            const isCompleted = form.status === 'completed';
                            const ctaLabel = form.status === 'pending' ? 'Start' : form.status === 'in_progress' ? 'Continue' : 'View';

                            return (
                                <tr
                                    key={form.assignmentId}
                                    className={`transition-colors hover:bg-white/5 ${isCompleted ? 'opacity-60' : ''}`}
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium truncate max-w-[250px]">{form.name}</span>
                                            {getUrgencyBadge(form)}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${sc.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                            {sc.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5 hidden sm:table-cell" style={{ color: '#94a3b8' }}>
                                        {isCompleted && form.completedAt
                                            ? <span className="text-green-400/80">{formatDate(form.completedAt)}</span>
                                            : formatDate(form.dueDate)}
                                    </td>
                                    <td className="px-5 py-3.5 hidden md:table-cell" style={{ color: '#64748b' }}>
                                        {formatDate(form.createdAt)}
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <button
                                            onClick={() => handleOpen(form)}
                                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all
                                                ${isCompleted
                                                    ? 'bg-white/10 text-white/80 hover:bg-white/20'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                                }`}
                                        >
                                            {ctaLabel}
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
