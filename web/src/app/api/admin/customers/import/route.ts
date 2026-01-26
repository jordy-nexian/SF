/**
 * POST /api/admin/customers/import
 * Bulk import customers from CSV data.
 * 
 * Expected CSV format:
 * email,name,externalId
 * john@example.com,John Doe,CRM-123
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import prisma from '@/lib/prisma';

interface ImportRow {
    email: string;
    name?: string;
    externalId?: string;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.tenantId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['owner', 'admin'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        if (!body.rows || !Array.isArray(body.rows)) {
            return NextResponse.json(
                { error: 'rows array is required' },
                { status: 400 }
            );
        }

        const rows: ImportRow[] = body.rows;
        const results = {
            created: 0,
            skipped: 0,
            errors: [] as string[],
        };

        // Process each row
        for (const row of rows) {
            if (!row.email || typeof row.email !== 'string') {
                results.errors.push(`Invalid row: missing email`);
                continue;
            }

            const email = row.email.trim().toLowerCase();

            // Basic email validation
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                results.errors.push(`Invalid email: ${email}`);
                continue;
            }

            try {
                // Check if customer already exists
                const existing = await prisma.endCustomer.findUnique({
                    where: {
                        tenantId_email: {
                            tenantId: session.user.tenantId,
                            email,
                        },
                    },
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                // Create customer
                await prisma.endCustomer.create({
                    data: {
                        tenantId: session.user.tenantId,
                        email,
                        name: row.name?.trim() || null,
                        externalId: row.externalId?.trim() || null,
                    },
                });

                results.created++;
            } catch (error) {
                results.errors.push(`Failed to import: ${email}`);
            }
        }

        return NextResponse.json({
            success: true,
            results: {
                total: rows.length,
                created: results.created,
                skipped: results.skipped,
                errors: results.errors.slice(0, 10), // Limit error messages
                hasMoreErrors: results.errors.length > 10,
            },
        });
    } catch (error) {
        console.error('[Admin Import] Error:', error);
        return NextResponse.json(
            { error: 'Failed to process import' },
            { status: 500 }
        );
    }
}
