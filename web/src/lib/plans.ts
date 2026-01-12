// Plan configuration and limits
// All plan limits and pricing defined in one place

export type PlanId = 'free' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
	forms: number;
	submissionsPerMonth: number;
	teamMembers: number;
	customThemes: number;
	webhookFailover: boolean;
	customDomain: boolean;
	abTesting: boolean;
	removeBranding: boolean;
	prioritySupport: boolean;
	apiAccess: boolean;
	analyticsRetentionDays: number;
	fileUploadMb: number;
}

export interface PlanPricing {
	monthly: number;
	annual: number; // Per month when billed annually
	annualTotal: number; // Total annual price
	savings: number; // Percentage saved with annual
}

export interface Plan {
	id: PlanId;
	name: string;
	description: string;
	limits: PlanLimits;
	pricing: PlanPricing;
	popular?: boolean;
	features: string[];
	stripeMonthlyPriceId?: string;
	stripeAnnualPriceId?: string;
	paypalMonthlyPlanId?: string;
	paypalAnnualPlanId?: string;
}

// Plan definitions
export const PLANS: Record<PlanId, Plan> = {
	free: {
		id: 'free',
		name: 'Free',
		description: 'Perfect for getting started',
		limits: {
			forms: 3,
			submissionsPerMonth: 100,
			teamMembers: 1,
			customThemes: 1,
			webhookFailover: false,
			customDomain: false,
			abTesting: false,
			removeBranding: false,
			prioritySupport: false,
			apiAccess: false,
			analyticsRetentionDays: 7,
			fileUploadMb: 5,
		},
		pricing: {
			monthly: 0,
			annual: 0,
			annualTotal: 0,
			savings: 0,
		},
		features: [
			'Up to 3 forms',
			'100 submissions/month',
			'Basic analytics (7 days)',
			'Email support',
			'Standard themes',
		],
	},
	pro: {
		id: 'pro',
		name: 'Pro',
		description: 'For growing businesses',
		popular: true,
		limits: {
			forms: 25,
			submissionsPerMonth: 5000,
			teamMembers: 5,
			customThemes: 10,
			webhookFailover: true,
			customDomain: false,
			abTesting: true,
			removeBranding: true,
			prioritySupport: false,
			apiAccess: true,
			analyticsRetentionDays: 90,
			fileUploadMb: 25,
		},
		pricing: {
			monthly: 29,
			annual: 24, // $24/mo billed annually
			annualTotal: 288, // $288/year
			savings: 17, // 17% savings
		},
		features: [
			'Up to 25 forms',
			'5,000 submissions/month',
			'5 team members',
			'A/B testing',
			'Webhook failover',
			'Remove branding',
			'API access',
			'90-day analytics',
			'Priority email support',
		],
		// These will be set from environment variables
		stripeMonthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
		stripeAnnualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
		paypalMonthlyPlanId: process.env.PAYPAL_PRO_MONTHLY_PLAN_ID,
		paypalAnnualPlanId: process.env.PAYPAL_PRO_ANNUAL_PLAN_ID,
	},
	enterprise: {
		id: 'enterprise',
		name: 'Enterprise',
		description: 'For large organizations',
		limits: {
			forms: Infinity,
			submissionsPerMonth: Infinity,
			teamMembers: Infinity,
			customThemes: Infinity,
			webhookFailover: true,
			customDomain: true,
			abTesting: true,
			removeBranding: true,
			prioritySupport: true,
			apiAccess: true,
			analyticsRetentionDays: 365,
			fileUploadMb: 100,
		},
		pricing: {
			monthly: 99,
			annual: 82, // $82/mo billed annually
			annualTotal: 984, // $984/year
			savings: 17, // 17% savings
		},
		features: [
			'Unlimited forms',
			'Unlimited submissions',
			'Unlimited team members',
			'Custom domain',
			'All Pro features',
			'SSO/SAML (coming soon)',
			'Dedicated support',
			'SLA guarantee',
			'1-year analytics retention',
		],
		stripeMonthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
		stripeAnnualPriceId: process.env.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID,
		paypalMonthlyPlanId: process.env.PAYPAL_ENTERPRISE_MONTHLY_PLAN_ID,
		paypalAnnualPlanId: process.env.PAYPAL_ENTERPRISE_ANNUAL_PLAN_ID,
	},
};

// Helper to get plan by ID
export function getPlan(planId: PlanId): Plan {
	return PLANS[planId] || PLANS.free;
}

// Helper to check if a feature is available for a plan
export function hasFeature(planId: PlanId, feature: keyof PlanLimits): boolean {
	const plan = getPlan(planId);
	const value = plan.limits[feature];
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value > 0;
	return false;
}

// Helper to get limit value
export function getLimit(planId: PlanId, limit: keyof PlanLimits): number | boolean {
	return getPlan(planId).limits[limit];
}

// Check if user can perform action based on current usage
export interface UsageCheck {
	allowed: boolean;
	current: number;
	limit: number;
	upgradeRequired: boolean;
	message?: string;
}

export function checkUsage(
	planId: PlanId,
	limitKey: 'forms' | 'submissionsPerMonth' | 'teamMembers' | 'customThemes',
	currentUsage: number
): UsageCheck {
	const limit = getPlan(planId).limits[limitKey];
	const allowed = limit === Infinity || currentUsage < limit;
	
	return {
		allowed,
		current: currentUsage,
		limit: limit === Infinity ? -1 : limit,
		upgradeRequired: !allowed,
		message: allowed 
			? undefined 
			: `You've reached your ${limitKey.replace(/([A-Z])/g, ' $1').toLowerCase()} limit. Upgrade to continue.`,
	};
}

// Get recommended upgrade plan
export function getUpgradePlan(currentPlan: PlanId): PlanId | null {
	if (currentPlan === 'free') return 'pro';
	if (currentPlan === 'pro') return 'enterprise';
	return null;
}

// Format price for display
export function formatPrice(amount: number, cycle: BillingCycle = 'monthly'): string {
	if (amount === 0) return 'Free';
	return `$${amount}${cycle === 'monthly' ? '/mo' : '/mo billed annually'}`;
}

// Calculate savings message
export function getSavingsMessage(plan: Plan): string | null {
	if (plan.pricing.savings <= 0) return null;
	const saved = plan.pricing.monthly * 12 - plan.pricing.annualTotal;
	return `Save $${saved}/year (${plan.pricing.savings}% off)`;
}












