"use client";

import { useEffect, useState } from "react";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCustomers() {
            try {
                const res = await fetch('/api/admin/customers/webhook');
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || `Request failed (${res.status})`);
                }
                const data = await res.json();
                const rows: Record<string, unknown>[] = Array.isArray(data.customers)
                    ? data.customers
                    : [];

                // Derive columns from the keys of the first row
                if (rows.length > 0) {
                    setColumns(Object.keys(rows[0]));
                }
                setCustomers(rows);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load customers');
            } finally {
                setLoading(false);
            }
        }
        fetchCustomers();
    }, []);

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Companies</h1>
                <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                    Manage portal users and assign templates.
                </p>
            </div>

            {/* Customers Table */}
            <div
                className="overflow-hidden rounded-xl"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="flex items-center gap-3" style={{ color: '#94a3b8' }}>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading customers...
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p style={{ color: '#ef4444' }}>{error}</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p style={{ color: '#64748b' }}>No companies found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
                                <tr>
                                    {columns.map((col) => (
                                        <th
                                            key={col}
                                            className="px-5 py-3 font-medium whitespace-nowrap"
                                            style={{ color: '#94a3b8' }}
                                        >
                                            {formatColumnHeader(col)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((row, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        {columns.map((col) => (
                                            <td
                                                key={col}
                                                className="px-5 py-4 whitespace-nowrap"
                                                style={{ color: '#cbd5e1' }}
                                            >
                                                {formatCellValue(row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

/** Convert camelCase / snake_case keys into readable headers */
function formatColumnHeader(key: string): string {
    return key
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
        .replace(/[_-]/g, ' ')                  // snake_case → snake case
        .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize words
}

/** Render a cell value as a readable string */
function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}
