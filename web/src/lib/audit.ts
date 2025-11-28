/**
 * Audit logging for admin actions.
 * Stores action metadata without any PII.
 */

import prisma from "@/lib/prisma";

export type AuditAction =
	| "form.created"
	| "form.updated"
	| "form.deleted"
	| "form.published"
	| "form.archived"
	| "form.duplicated"
	| "version.created"
	| "version.activated"
	| "theme.updated"
	| "settings.updated"
	| "webhook.tested";

export type AuditLogEntry = {
	tenantId: string;
	userId: string;
	action: AuditAction;
	resourceType: "form" | "version" | "theme" | "settings";
	resourceId: string;
	metadata?: Record<string, unknown>;
	ipAddress?: string;
	userAgent?: string;
};

/**
 * Log an admin action. Fails silently to not break operations.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
	try {
		await prisma.$executeRaw`
			INSERT INTO "AuditLog" ("id", "tenantId", "userId", "action", "resourceType", "resourceId", "metadata", "ipAddress", "userAgent", "createdAt")
			VALUES (
				${`audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`},
				${entry.tenantId},
				${entry.userId},
				${entry.action},
				${entry.resourceType},
				${entry.resourceId},
				${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
				${entry.ipAddress ?? null},
				${entry.userAgent ?? null},
				NOW()
			)
		`;
	} catch (err) {
		// Log to console but don't throw - audit failures shouldn't break operations
		console.error("Audit log failed:", err);
	}
}

/**
 * Get audit logs for a tenant (paginated).
 */
export async function getAuditLogs(
	tenantId: string,
	options: {
		limit?: number;
		offset?: number;
		resourceType?: string;
		resourceId?: string;
	} = {}
) {
	const { limit = 50, offset = 0, resourceType, resourceId } = options;

	const logs = await prisma.$queryRaw<
		{
			id: string;
			userId: string;
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
		WHERE "tenantId" = ${tenantId}
		${resourceType ? prisma.$queryRaw`AND "resourceType" = ${resourceType}` : prisma.$queryRaw``}
		${resourceId ? prisma.$queryRaw`AND "resourceId" = ${resourceId}` : prisma.$queryRaw``}
		ORDER BY "createdAt" DESC
		LIMIT ${limit}
		OFFSET ${offset}
	`;

	return logs;
}

