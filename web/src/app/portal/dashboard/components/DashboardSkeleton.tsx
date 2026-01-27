'use client';

export default function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse" aria-label="Loading dashboard..." role="status">
            {/* Summary skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Donut skeleton */}
                    <div className="w-40 h-40 rounded-full bg-white/10 flex-shrink-0"></div>

                    {/* Content skeleton */}
                    <div className="flex-1 space-y-4 w-full">
                        <div className="h-6 bg-white/10 rounded w-3/4 mx-auto md:mx-0"></div>
                        <div className="flex gap-4 justify-center md:justify-start">
                            <div className="h-4 bg-white/10 rounded w-20"></div>
                            <div className="h-4 bg-white/10 rounded w-24"></div>
                            <div className="h-4 bg-white/10 rounded w-20"></div>
                        </div>
                        <div className="h-10 bg-white/10 rounded-xl w-48 mx-auto md:mx-0"></div>
                    </div>
                </div>
            </div>

            {/* Forms list skeleton */}
            <div className="space-y-4">
                <div className="h-5 bg-white/10 rounded w-32"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2 flex-1">
                                    <div className="h-5 bg-white/10 rounded w-1/3"></div>
                                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                                </div>
                                <div className="h-9 bg-white/10 rounded-lg w-24"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <span className="sr-only">Loading your forms...</span>
        </div>
    );
}
