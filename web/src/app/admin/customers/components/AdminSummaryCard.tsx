'use client';

import { useEffect, useState } from 'react';
import AdminStatsDonut from './AdminStatsDonut';

interface OverviewStats {
    totalCustomers: number;
    recentCustomers: number;
    totalAssignments: number;
    completedAssignments: number;
    pendingAssignments: number;
    inProgressAssignments: number;
    completionRate: number;
}

export default function AdminSummaryCard() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/admin/analytics/portal');
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.overview);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div
                className="rounded-xl p-5 animate-pulse"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            >
                <div className="flex items-center gap-6">
                    <div className="w-28 h-28 rounded-full bg-white/10"></div>
                    <div className="flex-1 space-y-3">
                        <div className="h-5 bg-white/10 rounded w-48"></div>
                        <div className="flex gap-4">
                            <div className="h-4 bg-white/10 rounded w-20"></div>
                            <div className="h-4 bg-white/10 rounded w-24"></div>
                            <div className="h-4 bg-white/10 rounded w-20"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    const { totalCustomers, recentCustomers, totalAssignments, completedAssignments, pendingAssignments, inProgressAssignments, completionRate } = stats;

    return (
        <div
            className="rounded-xl p-5"
            style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
            }}
            role="region"
            aria-label="Customer portal overview"
        >
            <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Donut */}
                <div className="flex-shrink-0">
                    <AdminStatsDonut
                        completed={completedAssignments}
                        inProgress={inProgressAssignments}
                        notStarted={pendingAssignments}
                        size="md"
                    />
                </div>

                {/* Stats Grid */}
                <div className="flex-1 w-full">
                    <h2 className="text-lg font-semibold text-white mb-3">Portal Overview</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Customers */}
                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-white">{totalCustomers}</div>
                            <div className="text-xs text-white/60">Total Customers</div>
                            {recentCustomers > 0 && (
                                <div className="text-xs text-green-400 mt-0.5">+{recentCustomers} this month</div>
                            )}
                        </div>

                        {/* Assignments */}
                        <div className="text-center md:text-left">
                            <div className="text-2xl font-bold text-white">{totalAssignments}</div>
                            <div className="text-xs text-white/60">Template Assignments</div>
                        </div>

                        {/* Status breakdown */}
                        <div className="col-span-2 flex flex-wrap gap-3 justify-center md:justify-start">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true"></span>
                                <span className="text-sm text-white/80">{completedAssignments} Complete</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" aria-hidden="true"></span>
                                <span className="text-sm text-white/80">{inProgressAssignments} In progress</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" aria-hidden="true"></span>
                                <span className="text-sm text-white/80">{pendingAssignments} Pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
