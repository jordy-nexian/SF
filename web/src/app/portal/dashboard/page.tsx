'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    DashboardSummary,
    DashboardSkeleton,
    FormsSection,
    FormRow,
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

    function handleFormOpened(formId: string) {
        setForms(prev => prev.map(f =>
            f.formId === formId && f.status === 'pending'
                ? { ...f, status: 'in_progress' as const }
                : f
        ));
    }

    // Calculate stats
    const stats = useMemo(() => {
        const completed = forms.filter(f => f.status === 'completed').length;
        const inProgress = forms.filter(f => f.status === 'in_progress').length;
        const notStarted = forms.filter(f => f.status === 'pending').length;
        return { completed, inProgress, notStarted, total: forms.length };
    }, [forms]);

    // Group forms by urgency
    const groupedForms = useMemo(() => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const dueSoon: FormAssignment[] = [];
        const inProgress: FormAssignment[] = [];
        const notStarted: FormAssignment[] = [];
        const completed: FormAssignment[] = [];

        for (const form of forms) {
            if (form.status === 'completed') {
                completed.push(form);
            } else if (form.status === 'in_progress') {
                // Check if also due soon
                if (form.dueDate && new Date(form.dueDate) <= sevenDaysFromNow) {
                    dueSoon.push(form);
                } else {
                    inProgress.push(form);
                }
            } else if (form.status === 'pending') {
                // Check if due soon
                if (form.dueDate && new Date(form.dueDate) <= sevenDaysFromNow) {
                    dueSoon.push(form);
                } else {
                    notStarted.push(form);
                }
            }
        }

        // Sort due soon by date ascending (most urgent first)
        dueSoon.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        // Sort completed by completedAt descending
        completed.sort((a, b) => {
            if (!a.completedAt) return 1;
            if (!b.completedAt) return -1;
            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        });

        return { dueSoon, inProgress, notStarted, completed };
    }, [forms]);

    // Determine next form (for smart CTA)
    const nextForm = useMemo(() => {
        // Priority: due soon in_progress > due soon pending > in_progress > pending
        if (groupedForms.dueSoon.length > 0) {
            const inProgressDueSoon = groupedForms.dueSoon.find(f => f.status === 'in_progress');
            if (inProgressDueSoon) return inProgressDueSoon;
            return groupedForms.dueSoon[0];
        }
        if (groupedForms.inProgress.length > 0) {
            return groupedForms.inProgress[0];
        }
        if (groupedForms.notStarted.length > 0) {
            return groupedForms.notStarted[0];
        }
        return null;
    }, [groupedForms]);

    // Handle smart CTA click
    async function handleStartForm(formId: string, publicId: string) {
        const form = forms.find(f => f.formId === formId);
        if (form?.status === 'pending') {
            try {
                await fetch(`/api/portal/forms/${formId}/start`, { method: 'POST' });
                handleFormOpened(formId);
            } catch (error) {
                console.error('Failed to mark form as started:', error);
            }
        }
        router.push(`/f/${publicId}`);
    }

    // Loading state
    if (loading) {
        return <DashboardSkeleton />;
    }

    // Error state
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
                    onClick={() => {
                        setError('');
                        setLoading(true);
                        fetchForms();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                    Try again
                </button>
            </div>
        );
    }

    // Empty state
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
                <p className="text-white/70">When forms are assigned to you, they'll appear here.</p>
            </div>
        );
    }

    // Count due soon items for urgency badge
    const dueSoonCount = groupedForms.dueSoon.length;

    return (
        <div className="space-y-6">
            {/* Dashboard Summary with Donut */}
            <DashboardSummary
                stats={stats}
                nextForm={nextForm ? {
                    id: nextForm.formId,
                    publicId: nextForm.publicId,
                    name: nextForm.name,
                    status: nextForm.status as 'pending' | 'in_progress',
                } : null}
                onStartForm={handleStartForm}
            />

            {/* Forms List */}
            <div className="space-y-6">
                {/* Due Soon Section */}
                {groupedForms.dueSoon.length > 0 && (
                    <FormsSection
                        title="Due Soon"
                        count={groupedForms.dueSoon.length}
                        defaultExpanded={true}
                        urgencyBadge={dueSoonCount > 0 ? 'Action required' : undefined}
                    >
                        {groupedForms.dueSoon.map(form => (
                            <FormRow
                                key={form.assignmentId}
                                form={form}
                                onFormOpened={handleFormOpened}
                            />
                        ))}
                    </FormsSection>
                )}

                {/* In Progress Section */}
                {groupedForms.inProgress.length > 0 && (
                    <FormsSection
                        title="In Progress"
                        count={groupedForms.inProgress.length}
                        defaultExpanded={true}
                    >
                        {groupedForms.inProgress.map(form => (
                            <FormRow
                                key={form.assignmentId}
                                form={form}
                                onFormOpened={handleFormOpened}
                            />
                        ))}
                    </FormsSection>
                )}

                {/* Not Started Section */}
                {groupedForms.notStarted.length > 0 && (
                    <FormsSection
                        title="Not Started"
                        count={groupedForms.notStarted.length}
                        defaultExpanded={true}
                    >
                        {groupedForms.notStarted.map(form => (
                            <FormRow
                                key={form.assignmentId}
                                form={form}
                                onFormOpened={handleFormOpened}
                            />
                        ))}
                    </FormsSection>
                )}

                {/* Completed Section - collapsed by default */}
                {groupedForms.completed.length > 0 && (
                    <FormsSection
                        title="Completed"
                        count={groupedForms.completed.length}
                        defaultExpanded={false}
                    >
                        {groupedForms.completed.map(form => (
                            <FormRow
                                key={form.assignmentId}
                                form={form}
                                onFormOpened={handleFormOpened}
                            />
                        ))}
                    </FormsSection>
                )}
            </div>
        </div>
    );
}
