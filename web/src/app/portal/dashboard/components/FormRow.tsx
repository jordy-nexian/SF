'use client';

import { useRouter } from 'next/navigation';

interface FormRowProps {
    form: {
        assignmentId: string;
        formId: string;
        publicId: string;
        name: string;
        status: 'pending' | 'in_progress' | 'completed';
        dueDate: string | null;
        completedAt: string | null;
    };
    onFormOpened?: (formId: string) => void;
}

export default function FormRow({ form, onFormOpened }: FormRowProps) {
    const router = useRouter();
    const isCompleted = form.status === 'completed';

    // Calculate urgency
    const getUrgency = () => {
        if (!form.dueDate || isCompleted) return null;
        const due = new Date(form.dueDate);
        const now = new Date();
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) return { level: 'overdue', text: 'Overdue', class: 'bg-red-500/20 text-red-300' };
        if (daysUntilDue <= 3) return { level: 'urgent', text: 'Due soon', class: 'bg-red-500/20 text-red-300' };
        if (daysUntilDue <= 7) return { level: 'upcoming', text: `Due in ${daysUntilDue} days`, class: 'bg-amber-500/20 text-amber-300' };
        return null;
    };

    const urgency = getUrgency();

    // Status config
    const statusConfig = {
        pending: { label: 'Not started', icon: '○', class: 'text-slate-400' },
        in_progress: { label: 'In progress', icon: '◐', class: 'text-amber-400' },
        completed: { label: 'Completed', icon: '●', class: 'text-green-400' },
    };

    const status = statusConfig[form.status];

    // CTA config
    const getCta = () => {
        switch (form.status) {
            case 'pending': return 'Start';
            case 'in_progress': return 'Continue';
            case 'completed': return 'View';
        }
    };

    async function handleClick() {
        // Mark as in_progress if pending
        if (form.status === 'pending') {
            try {
                await fetch(`/api/portal/forms/${form.formId}/start`, { method: 'POST' });
                onFormOpened?.(form.formId);
            } catch (error) {
                console.error('Failed to mark form as started:', error);
            }
        }
        router.push(`/f/${form.publicId}`);
    }

    return (
        <div
            className={`bg-gradient-to-br from-white/10 to-white/5 border rounded-xl p-4 transition-all duration-200
                      ${isCompleted
                    ? 'border-white/10 opacity-75'
                    : urgency?.level === 'overdue'
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-white/20 hover:border-indigo-500/50'
                }`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Form info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={status.class} aria-hidden="true">{status.icon}</span>
                        <h3 className="font-semibold text-white truncate">{form.name}</h3>
                        {urgency && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.class}`}>
                                {urgency.text}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/70">
                        <span>{status.label}</span>
                        {form.dueDate && !isCompleted && (
                            <>
                                <span className="text-white/30">•</span>
                                <span className={urgency?.level === 'overdue' ? 'text-red-400' : ''}>
                                    Due: {new Date(form.dueDate).toLocaleDateString()}
                                </span>
                            </>
                        )}
                        {form.completedAt && (
                            <>
                                <span className="text-white/30">•</span>
                                <span>Completed: {new Date(form.completedAt).toLocaleDateString()}</span>
                            </>
                        )}
                        {form.status === 'in_progress' && (
                            <>
                                <span className="text-white/30">•</span>
                                <span className="text-indigo-400">Resume where you left off</span>
                            </>
                        )}
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleClick}
                    className={`flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
                              ${isCompleted
                            ? 'bg-white/10 text-white/80 hover:bg-white/20'
                            : 'bg-indigo-600 text-white hover:bg-indigo-500'
                        }`}
                >
                    {getCta()}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
