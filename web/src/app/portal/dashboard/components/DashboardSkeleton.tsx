'use client';

export default function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse" aria-label="Loading dashboard..." role="status">
            {/* Summary skeleton - matching admin style */}
            <div
                className="rounded-xl p-5"
                style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.1)'
                }}
            >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Donut skeleton */}
                    <div className="w-28 h-28 rounded-full bg-white/10 flex-shrink-0"></div>

                    {/* Stats skeleton */}
                    <div className="flex-1 w-full space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="h-5 bg-white/10 rounded w-32"></div>
                            <div className="h-9 bg-white/10 rounded-lg w-36"></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <div className="h-7 bg-white/10 rounded w-8"></div>
                                <div className="h-3 bg-white/10 rounded w-16"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-7 bg-white/10 rounded w-8"></div>
                                <div className="h-3 bg-white/10 rounded w-16"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-7 bg-white/10 rounded w-8"></div>
                                <div className="h-3 bg-white/10 rounded w-16"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="h-7 bg-white/10 rounded w-8"></div>
                                <div className="h-3 bg-white/10 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Forms section skeleton - matching admin style */}
            <div className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3">
                    <div className="w-4 h-4 bg-white/10 rounded"></div>
                    <div className="h-5 bg-white/10 rounded w-24"></div>
                    <div className="h-4 bg-white/10 rounded w-8"></div>
                </div>
                <div className="divide-y divide-white/5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="px-5 py-4 flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-white/10 rounded-full"></div>
                                    <div className="h-5 bg-white/10 rounded w-40"></div>
                                </div>
                                <div className="h-4 bg-white/10 rounded w-32"></div>
                            </div>
                            <div className="h-9 bg-white/10 rounded-lg w-24"></div>
                        </div>
                    ))}
                </div>
            </div>

            <span className="sr-only">Loading your forms...</span>
        </div>
    );
}
