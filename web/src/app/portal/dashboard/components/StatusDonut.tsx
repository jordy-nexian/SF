'use client';

interface StatusDonutProps {
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

export default function StatusDonut({
    completed,
    inProgress,
    notStarted,
    size = 'md',
    className = '',
}: StatusDonutProps) {
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

    // Calculate offsets (each segment starts where the previous one ends)
    const completedOffset = 0;
    const inProgressOffset = completedLength;
    const notStartedOffset = completedLength + inProgressLength;

    // Gap between segments (2px visual gap)
    const gap = total > 1 ? 4 : 0;

    // Determine center text - now shows percentage like admin
    const getCenterText = () => {
        if (total === 0) return { main: '0%', sub: 'complete' };
        const percentage = Math.round((completed / total) * 100);
        return { main: `${percentage}%`, sub: 'complete' };
    };

    const centerText = getCenterText();

    // ARIA label for accessibility
    const ariaLabel = total === 0
        ? 'No forms assigned'
        : `Progress: ${completed} of ${total} forms completed, ${inProgress} in progress, ${notStarted} not started`;

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
                {/* Background circle (for empty state) */}
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

            {/* Center text - now shows percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-bold text-white ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-xl'
                    }`}>
                    {centerText.main}
                </span>
                <span className="text-xs text-white/60">
                    {centerText.sub}
                </span>
            </div>
        </div>
    );
}
