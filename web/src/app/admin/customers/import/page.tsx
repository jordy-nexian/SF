'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ImportResults {
    total: number;
    created: number;
    skipped: number;
    errors: string[];
    hasMoreErrors: boolean;
}

export default function ImportCustomersPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState<ImportResults | null>(null);
    const [preview, setPreview] = useState<Array<{ email: string; name?: string; externalId?: string }>>([]);

    function parseCSV(text: string) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have a header row and at least one data row');
        }

        // Parse header
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const emailIndex = header.indexOf('email');
        const nameIndex = header.indexOf('name');
        const externalIdIndex = header.indexOf('externalid');

        if (emailIndex === -1) {
            throw new Error('CSV must have an "email" column');
        }

        // Parse data rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            if (values[emailIndex]) {
                rows.push({
                    email: values[emailIndex],
                    name: nameIndex >= 0 ? values[nameIndex] : undefined,
                    externalId: externalIdIndex >= 0 ? values[externalIdIndex] : undefined,
                });
            }
        }

        return rows;
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setResults(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rows = parseCSV(text);
                setPreview(rows.slice(0, 5));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to parse CSV');
                setPreview([]);
            }
        };
        reader.readAsText(file);
    }

    async function handleImport() {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        setError('');
        setResults(null);

        try {
            const text = await file.text();
            const rows = parseCSV(text);

            const res = await fetch('/api/admin/customers/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setResults(data.results);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mx-auto max-w-2xl">
            <div className="mb-6 flex items-center gap-4">
                <Link
                    href="/admin/customers"
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Import Customers</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Upload a CSV file to bulk import customers.
                    </p>
                </div>
            </div>

            <div
                className="rounded-xl p-8"
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* CSV Format Help */}
                <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <h3 className="text-sm font-medium text-white mb-2">CSV Format</h3>
                    <p className="text-xs text-slate-400 mb-2">
                        Your CSV file should have a header row with these columns:
                    </p>
                    <code className="block text-xs bg-slate-900 p-2 rounded text-indigo-300">
                        email,name,externalId<br />
                        john@example.com,John Doe,CRM-123<br />
                        jane@example.com,Jane Smith,CRM-456
                    </code>
                    <p className="text-xs text-slate-500 mt-2">
                        Only <code className="text-indigo-400">email</code> is required. Other columns are optional.
                    </p>
                </div>

                {/* File Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Select CSV File
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                </div>

                {/* Preview */}
                {preview.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-slate-300 mb-2">
                            Preview (first 5 rows)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-slate-400">
                                        <th className="py-2 pr-4 text-left">Email</th>
                                        <th className="py-2 pr-4 text-left">Name</th>
                                        <th className="py-2 text-left">External ID</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-300">
                                    {preview.map((row, i) => (
                                        <tr key={i}>
                                            <td className="py-1 pr-4">{row.email}</td>
                                            <td className="py-1 pr-4">{row.name || '—'}</td>
                                            <td className="py-1">{row.externalId || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {results && (
                    <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <h3 className="text-sm font-medium text-green-300 mb-2">Import Complete</h3>
                        <ul className="text-sm text-green-200 space-y-1">
                            <li>✓ Created: {results.created} customers</li>
                            <li>○ Skipped: {results.skipped} (already exist)</li>
                            {results.errors.length > 0 && (
                                <li className="text-red-300">
                                    ✗ Errors: {results.errors.length}
                                    {results.hasMoreErrors && '+'}
                                </li>
                            )}
                        </ul>
                        {results.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-300">
                                {results.errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <Link
                        href="/admin/customers"
                        className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleImport}
                        disabled={loading || preview.length === 0}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        {loading ? 'Importing...' : 'Import Customers'}
                    </button>
                </div>
            </div>
        </div>
    );
}
