'use client';

import { useState } from 'react';

interface FormsSectionProps {
    title: string;
    count: number;
    defaultExpanded?: boolean;
    urgencyBadge?: string;
    children: React.ReactNode;
}

export default function FormsSection({
    title,
    count,
    defaultExpanded = true,
    urgencyBadge,
    children,
}: FormsSectionProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <section
            className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden"
            aria-label={`${title} section with ${count} forms`}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
                aria-expanded={isExpanded}
                aria-controls={`section-${title.toLowerCase().replace(/\s/g, '-')}`}
            >
                <div className="flex items-center gap-3">
                    <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h2 className="font-semibold text-white">{title}</h2>
                    <span className="text-sm text-slate-400">({count})</span>
                </div>

                {urgencyBadge && (
                    <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-300 rounded-full">
                        {urgencyBadge}
                    </span>
                )}
            </button>

            {isExpanded && (
                <div
                    id={`section-${title.toLowerCase().replace(/\s/g, '-')}`}
                    className="divide-y divide-white/5"
                >
                    {children}
                </div>
            )}
        </section>
    );
}
