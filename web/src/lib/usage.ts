// Usage tracking utilities
// Check current usage against plan limits

import prisma from './prisma';
import { getPlan, checkUsage, type PlanId, type UsageCheck } from './plans';

export interface TenantUsage {
	forms: number;
	submissionsThisMonth: number;
	teamMembers: number;
	customThemes: number;
}

// Get current usage for a tenant
export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [formCount, submissionCount, userCount, themeCount] = await Promise.all([
		prisma.form.count({ where: { tenantId } }),
		prisma.submissionEvent.count({
			where: {
				tenantId,
				submittedAt: { gte: startOfMonth },
			},
		}),
		prisma.user.count({ where: { tenantId } }),
		prisma.theme.count({ where: { tenantId } }),
	]);

	return {
		forms: formCount,
		submissionsThisMonth: submissionCount,
		teamMembers: userCount,
		customThemes: themeCount,
	};
}

// Check if tenant can create a new form
export async function canCreateForm(tenantId: string, planId: PlanId): Promise<UsageCheck> {
	const usage = await getTenantUsage(tenantId);
	return checkUsage(planId, 'forms', usage.forms);
}

// Check if tenant can receive more submissions this month
export async function canReceiveSubmission(tenantId: string, planId: PlanId): Promise<UsageCheck> {
	const usage = await getTenantUsage(tenantId);
	return checkUsage(planId, 'submissionsPerMonth', usage.submissionsThisMonth);
}

// Check if tenant can add more team members
export async function canAddTeamMember(tenantId: string, planId: PlanId): Promise<UsageCheck> {
	const usage = await getTenantUsage(tenantId);
	return checkUsage(planId, 'teamMembers', usage.teamMembers);
}

// Check if tenant can create more custom themes
export async function canCreateTheme(tenantId: string, planId: PlanId): Promise<UsageCheck> {
	const usage = await getTenantUsage(tenantId);
	return checkUsage(planId, 'customThemes', usage.customThemes);
}

// Get full usage report with limits
export interface UsageReport {
	plan: PlanId;
	planName: string;
	usage: TenantUsage;
	limits: {
		forms: UsageCheck;
		submissions: UsageCheck;
		teamMembers: UsageCheck;
		themes: UsageCheck;
	};
	features: {
		webhookFailover: boolean;
		customDomain: boolean;
		abTesting: boolean;
		removeBranding: boolean;
		apiAccess: boolean;
	};
}

export async function getUsageReport(tenantId: string, planId: PlanId): Promise<UsageReport> {
	const usage = await getTenantUsage(tenantId);
	const plan = getPlan(planId);

	return {
		plan: planId,
		planName: plan.name,
		usage,
		limits: {
			forms: checkUsage(planId, 'forms', usage.forms),
			submissions: checkUsage(planId, 'submissionsPerMonth', usage.submissionsThisMonth),
			teamMembers: checkUsage(planId, 'teamMembers', usage.teamMembers),
			themes: checkUsage(planId, 'customThemes', usage.customThemes),
		},
		features: {
			webhookFailover: plan.limits.webhookFailover,
			customDomain: plan.limits.customDomain,
			abTesting: plan.limits.abTesting,
			removeBranding: plan.limits.removeBranding,
			apiAccess: plan.limits.apiAccess,
		},
	};
}

// Check if approaching limit (80% threshold)
export function isApproachingLimit(check: UsageCheck): boolean {
	if (check.limit === -1) return false; // Unlimited
	return check.current >= check.limit * 0.8;
}

// Get percentage of limit used
export function getUsagePercentage(check: UsageCheck): number {
	if (check.limit === -1) return 0; // Unlimited
	if (check.limit === 0) return 100;
	return Math.min(100, Math.round((check.current / check.limit) * 100));
}












