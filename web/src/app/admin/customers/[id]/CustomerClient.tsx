'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Assignment {
    id: string;
    formId: string;
    formName: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: string | null;
    completedAt: string | null;
}

interface Customer {
    id: string;
    email: string;
    name: string | null;
    externalId: string | null;
    assignments: Assignment[];
}

interface CustomerClientProps {
    initialCustomer: Customer;
    tenantForms: Array<{ id: string; name: string }>;
}

export default function CustomerClient({ initialCustomer, tenantForms }: CustomerClientProps) {
    const router = useRouter();
    const [customer, setCustomer] = useState(initialCustomer);
    const [isInviteLoading, setIsInviteLoading] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignFormId, setAssignFormId] = useState('');
    const [assignDueDate, setAssignDueDate] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);

    async function handleSendInvite() {
        if (!confirm('Send magic link invitation to this customer?')) return;
        setIsInviteLoading(true);
        try {
            const res = await fetch(`/api/admin/customers/${customer.id}/invite`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to send invite');
            alert('Invitation sent successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to send invitation');
        } finally {
            setIsInviteLoading(false);
        }
    }

    async function handleAssignForm(e: React.FormEvent) {
        e.preventDefault();
        if (!assignFormId) return;
        setAssignLoading(true);

        try {
            const res = await fetch('/api/admin/assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endCustomerId: customer.id,
                    formId: assignFormId,
                    dueDate: assignDueDate || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to assign form');
            }

            // Refresh data
            router.refresh();
            setShowAssignModal(false);
            setAssignFormId('');
            setAssignDueDate('');
            // Reload page to get fresh server data or optimistically update (reload for MVP is fine)
            window.location.reload();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to assign form');
        } finally {
            setAssignLoading(false);
        }
    }

    async function handleDeleteAssignment(id: string) {
        if (!confirm('Are you sure you want to remove this assignment?')) return;
        try {
            await fetch(`/api/admin/assignments/${id}`, { method: 'DELETE' });
            window.location.reload();
        } catch (error) {
            alert('Failed to delete assignment');
        }
    }

    async function handleSendReminder(assignmentId: string) {
        if (!confirm('Send a reminder email for this form?')) return;
        try {
            const res = await fetch(`/api/admin/assignments/${assignmentId}/remind`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send reminder');
            alert(data.message || 'Reminder sent!');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to send reminder');
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/customers"
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{customer.name || customer.email}</h1>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                            <span>{customer.email}</span>
                            {customer.externalId && (
                                <>
                                    <span>•</span>
                                    <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-xs">{customer.externalId}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleSendInvite}
                        disabled={isInviteLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600 text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                        {isInviteLoading ? 'Sending...' : 'Empty Send Invite'}
                    </button>
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                    >
                        Assign Form
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="font-semibold text-white">Assigned Forms</h2>
                </div>

                <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-3 font-medium text-slate-400">Form Name</th>
                            <th className="px-6 py-3 font-medium text-slate-400">Status</th>
                            <th className="px-6 py-3 font-medium text-slate-400">Due Date</th>
                            <th className="px-6 py-3 font-medium text-slate-400">Completed</th>
                            <th className="px-6 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {customer.assignments.map((assignment) => (
                            <tr key={assignment.id}>
                                <td className="px-6 py-4 text-white font-medium">{assignment.formName}</td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={assignment.status} />
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                    {assignment.completedAt ? new Date(assignment.completedAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {assignment.status !== 'completed' && (
                                        <button
                                            onClick={() => handleSendReminder(assignment.id)}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm"
                                        >
                                            Remind
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteAssignment(assignment.id)}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {customer.assignments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No forms assigned yet. Click "Assign Form" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assign Form Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Assign Form</h3>
                        <form onSubmit={handleAssignForm}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Form</label>
                                    <select
                                        required
                                        value={assignFormId}
                                        onChange={(e) => setAssignFormId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select a form...</option>
                                        {tenantForms.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Due Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={assignDueDate}
                                        onChange={(e) => setAssignDueDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignLoading}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                >
                                    {assignLoading ? 'Assigning...' : 'Assign Form'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        pending: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Pending' },
        in_progress: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'In Progress' },
        completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
    };
    const style = styles[status as keyof typeof styles] || styles.pending;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
}
