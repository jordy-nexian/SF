/**
 * Platform Admin Audit Logging
 * Logs all actions performed by platform administrators (super admins).
 * Uses the existing AuditLog table with a special "platform" tenant marker.
 */

import prisma from "@/lib/prisma";

export type PlatformAuditAction =
    | "impersonation.started"
    | "impersonation.stopped"
    | "tenant.plan.updated"
    | "tenant.status.updated"
    | "tenant.deleted"
    | "tenant.created"
    | "user.deleted"
    | "user.updated";

export interface PlatformAuditEntry {
    adminEmail: string;
    action: PlatformAuditAction;
    targetType: "tenant" | "user";
    targetId: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
}

// Special tenant ID marker for platform admin actions
const PLATFORM_TENANT_ID = "platform-admin";

/**
 * Log a platform admin action. Fails silently to not break operations.
 */
export async function logPlatformAudit(entry: PlatformAuditEntry): Promise<void> {
    try {
        // Use the existing AuditLog table with a special platform tenant marker
        await prisma.$executeRaw`
			INSERT INTO "AuditLog" (
				"id", 
				"tenantId", 
				"userId", 
				"action", 
				"resourceType", 
				"resourceId", 
				"metadata", 
				"ipAddress", 
				"userAgent", 
				"createdAt"
			)
			VALUES (
				${`platform_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${PLATFORM_TENANT_ID},
				${entry.adminEmail},
				${entry.action},
				${entry.targetType},
				${entry.targetId},
				${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
				${entry.ipAddress ?? null},
				${entry.userAgent ?? null},
				NOW()
			)
		`;
    } catch (err) {
        // Log to console but don't throw - audit failures shouldn't break operations
        console.error("[PlatformAudit] Failed to log:", err);
    }
}

/**
 * Get platform admin audit logs (paginated).
 */
export async function getPlatformAuditLogs(options: {
    limit?: number;
    offset?: number;
    action?: PlatformAuditAction;
    adminEmail?: string;
} = {}) {
    const { limit = 50, offset = 0 } = options;

    const logs = await prisma.$queryRaw<
        {
            id: string;
            userId: string; // This is adminEmail for platform logs
            action: string;
            resourceType: string;
            resourceId: string;
            metadata: unknown;
            ipAddress: string | null;
            createdAt: Date;
        }[]
    >`
		SELECT "id", "userId", "action", "resourceType", "resourceId", "metadata", "ipAddress", "createdAt"
		FROM "AuditLog"
		WHERE "tenantId" = ${PLATFORM_TENANT_ID}
		ORDER BY "createdAt" DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

    return logs.map(log => ({
        ...log,
        adminEmail: log.userId, // Rename for clarity
    }));
}
