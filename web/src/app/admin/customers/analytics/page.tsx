'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
    overview: {
        totalCustomers: number;
        recentCustomers: number;
        totalAssignments: number;
        completedAssignments: number;
        pendingAssignments: number;
        inProgressAssignments: number;
        completionRate: number;
    };
    formStats: Array<{
        formId: string;
        formName: string;
        totalAssignments: number;
        completedAssignments: number;
        completionRate: number;
    }>;
}

export default function PortalAnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    async function fetchAnalytics() {
        try {
            const res = await fetch('/api/admin/analytics/portal');
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400">
                Loading analytics...
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center h-64 text-red-400">
                {error || 'Failed to load'}
            </div>
        );
    }

    const { overview, formStats } = data;

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Portal Analytics</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Track fund coordinator engagement and template completion rates.
                </p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total Fund Coordinators"
                    value={overview.totalCustomers}
                    subtext={`+${overview.recentCustomers} this month`}
                />
                <StatCard
                    label="Assigned Forms"
                    value={overview.totalAssignments}
                />
                <StatCard
                    label="Completed"
                    value={overview.completedAssignments}
                    color="green"
                />
                <StatCard
                    label="Completion Rate"
                    value={`${overview.completionRate}%`}
                    color={overview.completionRate >= 70 ? 'green' : overview.completionRate >= 40 ? 'amber' : 'red'}
                />
            </div>

            {/* Status Breakdown */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Assignment Status</h2>
                <div className="bg-slate-900/50 rounded-xl border border-white/10 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                            <div className="h-4 rounded-full bg-slate-800 overflow-hidden flex">
                                {overview.totalAssignments > 0 && (
                                    <>
                                        <div
                                            className="h-full bg-green-500"
                                            style={{ width: `${(overview.completedAssignments / overview.totalAssignments) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-amber-500"
                                            style={{ width: `${(overview.inProgressAssignments / overview.totalAssignments) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-slate-500"
                                            style={{ width: `${(overview.pendingAssignments / overview.totalAssignments) * 100}%` }}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-slate-400">Completed ({overview.completedAssignments})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500" />
                            <span className="text-slate-400">In Progress ({overview.inProgressAssignments})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-500" />
                            <span className="text-slate-400">Pending ({overview.pendingAssignments})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-Form Stats */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Template Performance</h2>
                <div className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-400">Template Name</th>
                                <th className="px-6 py-3 font-medium text-slate-400">Assigned</th>
                                <th className="px-6 py-3 font-medium text-slate-400">Completed</th>
                                <th className="px-6 py-3 font-medium text-slate-400">Completion Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {formStats.map((form) => (
                                <tr key={form.formId}>
                                    <td className="px-6 py-4 text-white font-medium">{form.formName}</td>
                                    <td className="px-6 py-4 text-slate-300">{form.totalAssignments}</td>
                                    <td className="px-6 py-4 text-slate-300">{form.completedAssignments}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-24 h-2 rounded-full bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500"
                                                    style={{ width: `${form.completionRate}%` }}
                                                />
                                            </div>
                                            <span className="text-slate-300">{form.completionRate}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {formStats.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No forms have been assigned yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    subtext,
    color = 'default'
}: {
    label: string;
    value: string | number;
    subtext?: string;
    color?: 'default' | 'green' | 'amber' | 'red';
}) {
    const colorClasses = {
        default: 'text-white',
        green: 'text-green-400',
        amber: 'text-amber-400',
        red: 'text-red-400',
    };

    return (
        <div className="bg-slate-900/50 rounded-xl border border-white/10 p-5">
            <div className="text-sm text-slate-400 mb-1">{label}</div>
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}
