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
    userName,
    onStartForm,
}: DashboardSummaryProps) {
    const greeting = userName
        ? `Hi ${userName.split(' ')[0]}!`
        : 'Welcome back!';

    const getMessage = () => {
        if (stats.total === 0) {
            return "No forms assigned yet.";
        }
        if (stats.completed === stats.total) {
            return "🎉 You've completed all your forms!";
        }
        const pending = stats.inProgress + stats.notStarted;
        if (pending === 1) {
            return "You have 1 form to complete.";
        }
        return `You have ${pending} forms to complete.`;
    };

    const getCtaText = () => {
        if (!nextForm) return null;
        return nextForm.status === 'in_progress'
            ? `Continue "${nextForm.name}"`
            : `Start "${nextForm.name}"`;
    };

    return (
        <div
            className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl p-6"
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
                        size="lg"
                    />
                </div>

                {/* Summary Content */}
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-xl font-bold text-white mb-2">
                        {greeting} {getMessage()}
                    </h2>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true"></span>
                            <span className="text-white/80">{stats.completed} Complete</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500" aria-hidden="true"></span>
                            <span className="text-white/80">{stats.inProgress} In progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-slate-500" aria-hidden="true"></span>
                            <span className="text-white/80">{stats.notStarted} Not started</span>
                        </div>
                    </div>

                    {/* Next Action CTA */}
                    {nextForm && (
                        <button
                            onClick={() => onStartForm(nextForm.id, nextForm.publicId)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 
                                     text-white font-medium rounded-xl transition-all duration-200
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        >
                            {getCtaText()}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
