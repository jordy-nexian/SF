'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Assignment {
    id: string;
    status: string;
    dueDate: string | null;
    createdAt: string;
    approvalStep: number | null;
    totalSteps: number | null;
    endCustomer: {
        id: string;
        name: string | null;
        email: string;
    };
    form: {
        id: string;
        name: string;
        publicId: string;
    };
    createdByUser: {
        id: string;
        email: string;
    } | null;
}

interface AdminUser {
    id: string;
    email: string;
}

export default function AssignmentsPage() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [selectedAdmin, setSelectedAdmin] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAssignments();
        fetchAdmins();
    }, [selectedAdmin, statusFilter]);

    async function fetchAssignments() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedAdmin !== 'all') params.set('createdBy', selectedAdmin);
            if (statusFilter !== 'all') params.set('status', statusFilter);

            const res = await fetch(`/api/admin/assignments?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setAssignments(data.assignments || []);
            }
        } catch (err) {
            console.error('Failed to fetch assignments:', err);
        }
        setLoading(false);
    }

    async function fetchAdmins() {
        try {
            const res = await fetch('/api/admin/team');
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch admins:', err);
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; color: string }> = {
            pending: { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' },
            in_progress: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
            completed: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
            expired: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
        };
        const s = styles[status] || styles.pending;
        return (
            <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
                style={{ background: s.bg, color: s.color }}
            >
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">All Assignments</h1>
                    <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                        View and manage form assignments across all customers and team members.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                        Assigned By:
                    </label>
                    <select
                        value={selectedAdmin}
                        onChange={(e) => setSelectedAdmin(e.target.value)}
                        className="rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <option value="all">All Admins</option>
                        {admins.map((a) => (
                            <option key={a.id} value={a.id}>
                                {a.email}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
                        Status:
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* Assignments Table */}
            <div
                className="overflow-hidden rounded-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <table className="min-w-full text-left text-sm">
                    <thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                        <tr>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Customer</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Form</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Status</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Assigned By</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Due Date</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}>Step</th>
                            <th className="px-5 py-3 font-medium" style={{ color: '#94a3b8' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td className="px-5 py-12 text-center" colSpan={7} style={{ color: '#64748b' }}>
                                    Loading...
                                </td>
                            </tr>
                        ) : assignments.length === 0 ? (
                            <tr>
                                <td className="px-5 py-12 text-center" colSpan={7} style={{ color: '#64748b' }}>
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <p>No assignments match your filters.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            assignments.map((a) => (
                                <tr key={a.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <td className="px-5 py-4">
                                        <Link
                                            href={`/admin/customers/${a.endCustomer.id}`}
                                            className="font-medium text-white hover:text-indigo-400 transition-colors"
                                        >
                                            {a.endCustomer.name || a.endCustomer.email}
                                        </Link>
                                        {a.endCustomer.name && (
                                            <div className="text-xs" style={{ color: '#64748b' }}>
                                                {a.endCustomer.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4" style={{ color: '#cbd5e1' }}>
                                        {a.form.name}
                                    </td>
                                    <td className="px-5 py-4">
                                        {getStatusBadge(a.status)}
                                    </td>
                                    <td className="px-5 py-4" style={{ color: '#64748b' }}>
                                        {a.createdByUser?.email || '—'}
                                    </td>
                                    <td className="px-5 py-4" style={{ color: '#64748b' }}>
                                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {a.totalSteps ? (
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                                style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa' }}
                                            >
                                                {a.approvalStep || 1} / {a.totalSteps}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b' }}>—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Link
                                            href={`/admin/customers/${a.endCustomer.id}`}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
