// Billing utilities and limit enforcement

import prisma from './prisma';
import { getPlan, type PlanId } from './plans';
import { canCreateForm, canReceiveSubmission, canAddTeamMember, canCreateTheme } from './usage';

export type LimitType = 'forms' | 'submissions' | 'teamMembers' | 'themes';

export interface LimitCheckResult {
	allowed: boolean;
	limitType: LimitType;
	current: number;
	limit: number;
	message: string;
	upgradeTo?: PlanId;
}

// Check if action is allowed and return detailed result
export async function checkLimit(
	tenantId: string,
	planId: PlanId,
	limitType: LimitType
): Promise<LimitCheckResult> {
	let check;
	
	switch (limitType) {
		case 'forms':
			check = await canCreateForm(tenantId, planId);
			break;
		case 'submissions':
			check = await canReceiveSubmission(tenantId, planId);
			break;
		case 'teamMembers':
			check = await canAddTeamMember(tenantId, planId);
			break;
		case 'themes':
			check = await canCreateTheme(tenantId, planId);
			break;
	}

	const upgradeTo = check.upgradeRequired 
		? (planId === 'free' ? 'pro' : planId === 'pro' ? 'enterprise' : undefined)
		: undefined;

	const limitNames: Record<LimitType, string> = {
		forms: 'forms',
		submissions: 'submissions this month',
		teamMembers: 'team members',
		themes: 'custom themes',
	};

	return {
		allowed: check.allowed,
		limitType,
		current: check.current,
		limit: check.limit,
		message: check.allowed 
			? `You have ${check.limit === -1 ? 'unlimited' : check.limit - check.current} ${limitNames[limitType]} remaining`
			: `You've reached your limit of ${check.limit} ${limitNames[limitType]}. Please upgrade to continue.`,
		upgradeTo,
	};
}

// Enforce limit - throws error if not allowed
export async function enforceLimit(
	tenantId: string,
	planId: PlanId,
	limitType: LimitType
): Promise<void> {
	const result = await checkLimit(tenantId, planId, limitType);
	
	if (!result.allowed) {
		const error = new Error(result.message) as Error & { code: string; upgradeTo?: PlanId };
		error.code = 'LIMIT_EXCEEDED';
		error.upgradeTo = result.upgradeTo;
		throw error;
	}
}

// Check if feature is available for plan
export function checkFeature(
	planId: PlanId,
	feature: 'webhookFailover' | 'customDomain' | 'abTesting' | 'removeBranding' | 'apiAccess'
): boolean {
	const plan = getPlan(planId);
	return plan.limits[feature];
}

// Enforce feature availability - throws error if not available
export function enforceFeature(
	planId: PlanId,
	feature: 'webhookFailover' | 'customDomain' | 'abTesting' | 'removeBranding' | 'apiAccess'
): void {
	if (!checkFeature(planId, feature)) {
		const featureNames: Record<string, string> = {
			webhookFailover: 'Webhook failover',
			customDomain: 'Custom domains',
			abTesting: 'A/B testing',
			removeBranding: 'Remove branding',
			apiAccess: 'API access',
		};
		
		const error = new Error(`${featureNames[feature]} is not available on your current plan. Please upgrade to access this feature.`) as Error & { code: string };
		error.code = 'FEATURE_NOT_AVAILABLE';
		throw error;
	}
}

// Update tenant subscription
export async function updateSubscription(
	tenantId: string,
	data: {
		plan?: PlanId;
		stripeCustomerId?: string;
		stripeSubscriptionId?: string;
		paypalSubscriptionId?: string;
		billingCycle?: 'monthly' | 'annual';
		subscriptionStatus?: 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';
		currentPeriodStart?: Date;
		currentPeriodEnd?: Date;
		cancelAtPeriodEnd?: boolean;
	}
) {
	return prisma.tenant.update({
		where: { id: tenantId },
		data,
	});
}

// Cancel subscription at period end
export async function cancelSubscription(tenantId: string) {
	return prisma.tenant.update({
		where: { id: tenantId },
		data: { cancelAtPeriodEnd: true },
	});
}

// Reactivate canceled subscription
export async function reactivateSubscription(tenantId: string) {
	return prisma.tenant.update({
		where: { id: tenantId },
		data: { cancelAtPeriodEnd: false },
	});
}

// Downgrade to free plan
export async function downgradeToFree(tenantId: string) {
	return prisma.tenant.update({
		where: { id: tenantId },
		data: {
			plan: 'free',
			stripeSubscriptionId: null,
			paypalSubscriptionId: null,
			subscriptionStatus: 'none',
			currentPeriodStart: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
		},
	});
}





