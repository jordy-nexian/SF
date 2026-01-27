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
        <section aria-label={`${title} section with ${count} forms`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between py-2 group
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
                aria-expanded={isExpanded}
                aria-controls={`section-${title.toLowerCase().replace(/\s/g, '-')}`}
            >
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg
                        className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {title} ({count})
                </h2>

                {urgencyBadge && (
                    <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-300 rounded-full">
                        {urgencyBadge}
                    </span>
                )}
            </button>

            <div
                id={`section-${title.toLowerCase().replace(/\s/g, '-')}`}
                className={`space-y-3 overflow-hidden transition-all duration-300 ${isExpanded ? 'mt-3 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                {children}
            </div>
        </section>
    );
}
