'use client';

import StatusDonut from './StatusDonut';

interface FormStats {
    completed: number;
    inProgress: number;
    notStarted: number;
    total: number;
}

interface NextForm {
    id: string;
    publicId: string;
    name: string;
    status: 'pending' | 'in_progress';
}

interface DashboardSummaryProps {
    stats: FormStats;
    nextForm: NextForm | null;
    userName?: string;
    onStartForm: (formId: string, publicId: string) => void;
}

export default function DashboardSummary({
    stats,
    nextForm,
    onStartForm,
}: DashboardSummaryProps) {
    const getCtaText = () => {
        if (!nextForm) return null;
        return nextForm.status === 'in_progress'
            ? `Continue "${nextForm.name}"`
            : `Start "${nextForm.name}"`;
    };

    return (
        <div
            className="rounded-xl p-5"
            style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
            role="region"
            aria-label="Progress summary"
        >
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Donut Chart */}
                <div className="flex-shrink-0">
                    <StatusDonut
                        completed={stats.completed}
                        inProgress={stats.inProgress}
                        notStarted={stats.notStarted}
                        size="md"
                    />
                </div>

                {/* Stats Grid */}
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-white">Template Progress</h2>
                    </div>

                    {/* Stats Grid - matching admin style */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-white">{stats.total}</div>
                            <div className="text-xs text-white/60">Total Assigned</div>
                        </div>

                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                            <div className="text-xs text-white/60">Completed</div>
                        </div>

                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
                            <div className="text-xs text-white/60">In Progress</div>
                        </div>

                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-slate-400">{stats.notStarted}</div>
                            <div className="text-xs text-white/60">Not Started</div>
                        </div>
                    </div>

                    {/* Next Action CTA */}
                    {nextForm && (
                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => onStartForm(nextForm.id, nextForm.publicId)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 
                                         text-white text-sm font-medium rounded-lg transition-all duration-200
                                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                            >
                                {getCtaText()}
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
