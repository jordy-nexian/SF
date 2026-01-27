'use client';

interface AdminStatsDonutProps {
    completed: number;
    inProgress: number;
    notStarted: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const SIZES = {
    sm: 80,
    md: 120,
    lg: 160,
};

export default function AdminStatsDonut({
    completed,
    inProgress,
    notStarted,
    size = 'md',
    className = '',
}: AdminStatsDonutProps) {
    const total = completed + inProgress + notStarted;
    const dimension = SIZES[size];
    const strokeWidth = size === 'sm' ? 10 : size === 'md' ? 12 : 16;
    const radius = (dimension - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = dimension / 2;

    // Calculate segment lengths
    const completedLength = total > 0 ? (completed / total) * circumference : 0;
    const inProgressLength = total > 0 ? (inProgress / total) * circumference : 0;
    const notStartedLength = total > 0 ? (notStarted / total) * circumference : circumference;

    // Calculate offsets
    const completedOffset = 0;
    const inProgressOffset = completedLength;
    const notStartedOffset = completedLength + inProgressLength;

    const gap = total > 1 ? 4 : 0;

    // ARIA label
    const ariaLabel = total === 0
        ? 'No form assignments'
        : `Form assignments: ${completed} completed, ${inProgress} in progress, ${notStarted} pending`;

    return (
        <div
            className={`relative ${className}`}
            role="img"
            aria-label={ariaLabel}
        >
            <svg
                width={dimension}
                height={dimension}
                viewBox={`0 0 ${dimension} ${dimension}`}
                className="transform -rotate-90"
            >
                {/* Background circle */}
                {total === 0 && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-slate-700"
                    />
                )}

                {/* Not Started segment (gray) */}
                {notStarted > 0 && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${notStartedLength - gap} ${circumference}`}
                        strokeDashoffset={-notStartedOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                )}

                {/* In Progress segment (amber) */}
                {inProgress > 0 && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${inProgressLength - gap} ${circumference}`}
                        strokeDashoffset={-inProgressOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                )}

                {/* Completed segment (green) */}
                {completed > 0 && (
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${completedLength - gap} ${circumference}`}
                        strokeDashoffset={-completedOffset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                )}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold text-white ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
                    }`}>
                    {total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%'}
                </span>
                <span className="text-xs text-white/60">complete</span>
            </div>
        </div>
    );
}
