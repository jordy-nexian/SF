'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function PortalDashboard() {
    const router = useRouter();
    const [forms, setForms] = useState<FormAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchForms();
    }, []);

    async function fetchForms() {
        try {
            const res = await fetch('/api/portal/forms');

            if (res.status === 401) {
                router.push('/portal');
                return;
            }

            if (!res.ok) {
                throw new Error('Failed to fetch forms');
            }

            const data = await res.json();
            setForms(data.forms);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    const statusConfig = {
        pending: {
            label: 'Not started',
            bg: 'bg-slate-500/20',
            text: 'text-slate-300',
            icon: '○',
        },
        in_progress: {
            label: 'In progress',
            bg: 'bg-amber-500/20',
            text: 'text-amber-300',
            icon: '◐',
        },
        completed: {
            label: 'Completed',
            bg: 'bg-green-500/20',
            text: 'text-green-300',
            icon: '●',
        },
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-pulse text-white/60">Loading your forms...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                    onClick={() => fetchForms()}
                    className="text-indigo-400 hover:text-indigo-300 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

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
                <p className="text-white/60">When forms are assigned to you, they'll appear here.</p>
            </div>
        );
    }

    const pendingForms = forms.filter(f => f.status !== 'completed');
    const completedForms = forms.filter(f => f.status === 'completed');

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Your Forms</h1>
                <p className="text-white/60">Complete the forms below. Your progress is saved automatically.</p>
            </div>

            {/* Pending/In Progress Forms */}
            {pendingForms.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        To Complete ({pendingForms.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingForms.map((form) => (
                            <FormCard key={form.assignmentId} form={form} statusConfig={statusConfig} />
                        ))}
                    </div>
                </section>
            )}

            {/* Completed Forms */}
            {completedForms.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        Completed ({completedForms.length})
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {completedForms.map((form) => (
                            <FormCard key={form.assignmentId} form={form} statusConfig={statusConfig} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function FormCard({
    form,
    statusConfig
}: {
    form: FormAssignment;
    statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }>;
}) {
    const config = statusConfig[form.status];
    const isCompleted = form.status === 'completed';

    return (
        <Link
            href={`/f/${form.publicId}`}
            className={`block p-5 rounded-2xl border transition-all duration-200 group
				${isCompleted
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-gradient-to-br from-white/10 to-white/5 border-white/20 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10'
                }`}
        >
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {form.name}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                    {config.icon} {config.label}
                </span>
            </div>

            {form.dueDate && !isCompleted && (
                <p className="text-sm text-white/50 mb-3">
                    Due: {new Date(form.dueDate).toLocaleDateString()}
                </p>
            )}

            {form.completedAt && (
                <p className="text-sm text-white/50 mb-3">
                    Completed: {new Date(form.completedAt).toLocaleDateString()}
                </p>
            )}

            <div className="flex items-center text-sm text-indigo-400 group-hover:text-indigo-300">
                {isCompleted ? 'View submission' : 'Open form'}
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Link>
    );
}
