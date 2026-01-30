'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminStatsDonut } from '../components';

interface Assignment {
    id: string;
    formId: string;
    formName: string;
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: string | null;
    completedAt: string | null;
    publicId?: string; // For linking to form in webhook mode
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
    isWebhookMode?: boolean; // True when data comes from external webhook
}

export default function CustomerClient({ initialCustomer, tenantForms, isWebhookMode = false }: CustomerClientProps) {
    const router = useRouter();
    const [customer] = useState(initialCustomer);
    const [isInviteLoading, setIsInviteLoading] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignFormId, setAssignFormId] = useState('');
    const [assignDueDate, setAssignDueDate] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);

    // Calculate stats
    const stats = useMemo(() => {
        const completed = customer.assignments.filter(a => a.status === 'completed').length;
        const inProgress = customer.assignments.filter(a => a.status === 'in_progress').length;
        const pending = customer.assignments.filter(a => a.status === 'pending').length;
        return { completed, inProgress, pending, total: customer.assignments.length };
    }, [customer.assignments]);

    // Group assignments by urgency
    const groupedAssignments = useMemo(() => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const dueSoon: Assignment[] = [];
        const inProgress: Assignment[] = [];
        const notStarted: Assignment[] = [];
        const completed: Assignment[] = [];

        for (const assignment of customer.assignments) {
            if (assignment.status === 'completed') {
                completed.push(assignment);
            } else if (assignment.dueDate && new Date(assignment.dueDate) <= sevenDaysFromNow) {
                dueSoon.push(assignment);
            } else if (assignment.status === 'in_progress') {
                inProgress.push(assignment);
            } else {
                notStarted.push(assignment);
            }
        }

        // Sort due soon by date
        dueSoon.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

        return { dueSoon, inProgress, notStarted, completed };
    }, [customer.assignments]);

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

            router.refresh();
            setShowAssignModal(false);
            setAssignFormId('');
            setAssignDueDate('');
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/customers"
                        className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                    {/* Send Invite always available - works regardless of data source */}
                    <button
                        onClick={handleSendInvite}
                        disabled={isInviteLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-600 text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        {isInviteLoading ? 'Sending...' : 'Send Invite'}
                    </button>

                    {!isWebhookMode && (
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            + Assign Form
                        </button>
                    )}
                    {isWebhookMode && (
                        <span className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                            Synced from Quickbase
                        </span>
                    )}
                </div>
            </div>

            {/* Customer Summary Card */}
            <div
                className="rounded-xl p-5"
                style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
                role="region"
                aria-label="Customer form progress"
            >
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Donut */}
                    <div className="flex-shrink-0">
                        <AdminStatsDonut
                            completed={stats.completed}
                            inProgress={stats.inProgress}
                            notStarted={stats.pending}
                            size="md"
                        />
                    </div>

                    {/* Stats */}
                    <div className="flex-1 w-full">
                        <h2 className="text-lg font-semibold text-white mb-3">Form Progress</h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center md:text-left">
                                <div className="text-2xl font-bold text-white">{stats.total}</div>
                                <div className="text-xs text-white/60">Total Assigned</div>
                            </div>

                            <div className="text-center md:text-left">
                                <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                                <div className="text-xs text-white/60">Completed</div>
                            </div>

                            <div className="text-center md:text-left">
                                <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
                                <div className="text-xs text-white/60">In Progress</div>
                            </div>

                            <div className="text-center md:text-left">
                                <div className="text-2xl font-bold text-slate-400">{stats.pending}</div>
                                <div className="text-xs text-white/60">Not Started</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            <div className="space-y-4">
                {/* Due Soon */}
                {groupedAssignments.dueSoon.length > 0 && (
                    <AssignmentSection
                        title="Due Soon"
                        badge="Action required"
                        assignments={groupedAssignments.dueSoon}
                        onRemind={handleSendReminder}
                        onDelete={handleDeleteAssignment}
                        isWebhookMode={isWebhookMode}
                    />
                )}

                {/* In Progress */}
                {groupedAssignments.inProgress.length > 0 && (
                    <AssignmentSection
                        title="In Progress"
                        assignments={groupedAssignments.inProgress}
                        onRemind={handleSendReminder}
                        onDelete={handleDeleteAssignment}
                        isWebhookMode={isWebhookMode}
                    />
                )}

                {/* Not Started */}
                {groupedAssignments.notStarted.length > 0 && (
                    <AssignmentSection
                        title="Not Started"
                        assignments={groupedAssignments.notStarted}
                        onRemind={handleSendReminder}
                        onDelete={handleDeleteAssignment}
                        isWebhookMode={isWebhookMode}
                    />
                )}

                {/* Completed */}
                {groupedAssignments.completed.length > 0 && (
                    <AssignmentSection
                        title="Completed"
                        assignments={groupedAssignments.completed}
                        onRemind={handleSendReminder}
                        onDelete={handleDeleteAssignment}
                        defaultCollapsed
                        isWebhookMode={isWebhookMode}
                    />
                )}

                {/* Empty State */}
                {customer.assignments.length === 0 && (
                    <div
                        className="rounded-xl border border-white/10 p-12 text-center"
                        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                    >
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-slate-500">
                            {isWebhookMode ? 'No forms found in Quickbase.' : 'No forms assigned yet.'}
                        </p>
                        {!isWebhookMode && (
                            <button
                                onClick={() => setShowAssignModal(true)}
                                className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                            >
                                Assign a form →
                            </button>
                        )}
                    </div>
                )}
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

// Assignment Section Component
function AssignmentSection({
    title,
    badge,
    assignments,
    onRemind,
    onDelete,
    defaultCollapsed = false,
    isWebhookMode = false,
}: {
    title: string;
    badge?: string;
    assignments: Assignment[];
    onRemind: (id: string) => void;
    onDelete: (id: string) => void;
    defaultCollapsed?: boolean;
    isWebhookMode?: boolean;
}) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
        <div className="bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
            >
                <div className="flex items-center gap-3">
                    <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <span className="text-sm text-slate-400">({assignments.length})</span>
                </div>
                {badge && (
                    <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-300 rounded-full">
                        {badge}
                    </span>
                )}
            </button>

            {!isCollapsed && (
                <div className="divide-y divide-white/5">
                    {assignments.map((a) => (
                        <AssignmentRow
                            key={a.id}
                            assignment={a}
                            onRemind={onRemind}
                            onDelete={onDelete}
                            isWebhookMode={isWebhookMode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Assignment Row Component
function AssignmentRow({
    assignment,
    onRemind,
    onDelete,
    isWebhookMode = false,
}: {
    assignment: Assignment;
    onRemind: (id: string) => void;
    onDelete: (id: string) => void;
    isWebhookMode?: boolean;
}) {
    const isCompleted = assignment.status === 'completed';

    // Calculate urgency
    const getUrgency = () => {
        if (!assignment.dueDate || isCompleted) return null;
        const due = new Date(assignment.dueDate);
        const now = new Date();
        const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue < 0) return { text: 'Overdue', class: 'bg-red-500/20 text-red-300' };
        if (daysUntilDue <= 3) return { text: 'Due soon', class: 'bg-red-500/20 text-red-300' };
        return null;
    };

    const urgency = getUrgency();

    const statusConfig = {
        pending: { label: 'Not started', icon: '○', class: 'text-slate-400' },
        in_progress: { label: 'In progress', icon: '◐', class: 'text-amber-400' },
        completed: { label: 'Completed', icon: '●', class: 'text-green-400' },
    };
    const status = statusConfig[assignment.status];

    // Get publicId for form link (uses publicId if available, otherwise formId)
    const formPublicId = assignment.publicId || assignment.formId;

    return (
        <div className={`px-5 py-4 flex items-center justify-between gap-4 ${isCompleted ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={status.class} aria-hidden="true">{status.icon}</span>
                    <span className="font-medium text-white truncate">{assignment.formName}</span>
                    {urgency && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.class}`}>
                            {urgency.text}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>{status.label}</span>
                    {assignment.dueDate && !isCompleted && (
                        <>
                            <span className="text-slate-600">•</span>
                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </>
                    )}
                    {assignment.completedAt && (
                        <>
                            <span className="text-slate-600">•</span>
                            <span>Completed: {new Date(assignment.completedAt).toLocaleDateString()}</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isWebhookMode ? (
                    // Webhook mode: show Open Form link
                    <Link
                        href={`/f/${formPublicId}`}
                        target="_blank"
                        className="px-3 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        Open Form →
                    </Link>
                ) : (
                    // Database mode: show CRUD buttons
                    <>
                        {!isCompleted && (
                            <button
                                onClick={() => onRemind(assignment.id)}
                                className="px-3 py-1.5 text-sm text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors
                                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                                Remind
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(assignment.id)}
                            className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                            Remove
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
