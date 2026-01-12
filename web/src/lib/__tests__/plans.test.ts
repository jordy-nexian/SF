/**
 * Plans configuration tests
 */

import { describe, it, expect } from 'vitest';
import {
	PLANS,
	getPlan,
	hasFeature,
	getLimit,
	checkUsage,
	getUpgradePlan,
	formatPrice,
	getSavingsMessage,
	type PlanId,
} from '../plans';

describe('PLANS configuration', () => {
	it('has all required plans', () => {
		expect(PLANS).toHaveProperty('free');
		expect(PLANS).toHaveProperty('pro');
		expect(PLANS).toHaveProperty('enterprise');
	});

	it('free plan has correct limits', () => {
		const free = PLANS.free;
		
		expect(free.limits.forms).toBe(3);
		expect(free.limits.submissionsPerMonth).toBe(100);
		expect(free.limits.teamMembers).toBe(1);
		expect(free.limits.webhookFailover).toBe(false);
		expect(free.limits.abTesting).toBe(false);
	});

	it('pro plan has correct limits', () => {
		const pro = PLANS.pro;
		
		expect(pro.limits.forms).toBe(25);
		expect(pro.limits.submissionsPerMonth).toBe(5000);
		expect(pro.limits.teamMembers).toBe(5);
		expect(pro.limits.webhookFailover).toBe(true);
		expect(pro.limits.abTesting).toBe(true);
		expect(pro.popular).toBe(true);
	});

	it('enterprise plan has unlimited resources', () => {
		const enterprise = PLANS.enterprise;
		
		expect(enterprise.limits.forms).toBe(Infinity);
		expect(enterprise.limits.submissionsPerMonth).toBe(Infinity);
		expect(enterprise.limits.teamMembers).toBe(Infinity);
		expect(enterprise.limits.customDomain).toBe(true);
		expect(enterprise.limits.prioritySupport).toBe(true);
	});

	it('all plans have features array', () => {
		for (const plan of Object.values(PLANS)) {
			expect(Array.isArray(plan.features)).toBe(true);
			expect(plan.features.length).toBeGreaterThan(0);
		}
	});

	it('all plans have pricing information', () => {
		for (const plan of Object.values(PLANS)) {
			expect(typeof plan.pricing.monthly).toBe('number');
			expect(typeof plan.pricing.annual).toBe('number');
			expect(typeof plan.pricing.annualTotal).toBe('number');
		}
	});
});

describe('getPlan', () => {
	it('returns correct plan for valid ID', () => {
		expect(getPlan('free').id).toBe('free');
		expect(getPlan('pro').id).toBe('pro');
		expect(getPlan('enterprise').id).toBe('enterprise');
	});

	it('returns free plan for invalid ID', () => {
		const result = getPlan('invalid' as PlanId);
		expect(result.id).toBe('free');
	});
});

describe('hasFeature', () => {
	it('returns true for available features', () => {
		expect(hasFeature('pro', 'webhookFailover')).toBe(true);
		expect(hasFeature('pro', 'abTesting')).toBe(true);
		expect(hasFeature('enterprise', 'customDomain')).toBe(true);
	});

	it('returns false for unavailable features', () => {
		expect(hasFeature('free', 'webhookFailover')).toBe(false);
		expect(hasFeature('free', 'abTesting')).toBe(false);
		expect(hasFeature('free', 'customDomain')).toBe(false);
	});

	it('returns true for numeric limits > 0', () => {
		expect(hasFeature('free', 'forms')).toBe(true);
		expect(hasFeature('free', 'submissionsPerMonth')).toBe(true);
	});
});

describe('getLimit', () => {
	it('returns correct numeric limits', () => {
		expect(getLimit('free', 'forms')).toBe(3);
		expect(getLimit('pro', 'forms')).toBe(25);
		expect(getLimit('enterprise', 'forms')).toBe(Infinity);
	});

	it('returns correct boolean limits', () => {
		expect(getLimit('free', 'webhookFailover')).toBe(false);
		expect(getLimit('pro', 'webhookFailover')).toBe(true);
	});
});

describe('checkUsage', () => {
	it('allows usage under limit', () => {
		const result = checkUsage('free', 'forms', 2);
		
		expect(result.allowed).toBe(true);
		expect(result.upgradeRequired).toBe(false);
	});

	it('denies usage at limit', () => {
		const result = checkUsage('free', 'forms', 3);
		
		expect(result.allowed).toBe(false);
		expect(result.upgradeRequired).toBe(true);
		expect(result.message).toBeDefined();
	});

	it('denies usage over limit', () => {
		const result = checkUsage('free', 'forms', 5);
		
		expect(result.allowed).toBe(false);
	});

	it('always allows for unlimited (Infinity)', () => {
		const result = checkUsage('enterprise', 'forms', 1000);
		
		expect(result.allowed).toBe(true);
		expect(result.limit).toBe(-1); // -1 indicates unlimited
	});

	it('returns current usage and limit', () => {
		const result = checkUsage('pro', 'forms', 10);
		
		expect(result.current).toBe(10);
		expect(result.limit).toBe(25);
	});
});

describe('getUpgradePlan', () => {
	it('returns pro for free plan', () => {
		expect(getUpgradePlan('free')).toBe('pro');
	});

	it('returns enterprise for pro plan', () => {
		expect(getUpgradePlan('pro')).toBe('enterprise');
	});

	it('returns null for enterprise plan', () => {
		expect(getUpgradePlan('enterprise')).toBeNull();
	});
});

describe('formatPrice', () => {
	it('formats zero as Free', () => {
		expect(formatPrice(0)).toBe('Free');
	});

	it('formats monthly price', () => {
		expect(formatPrice(29)).toBe('$29/mo');
	});

	it('formats annual price', () => {
		expect(formatPrice(24, 'annual')).toBe('$24/mo billed annually');
	});
});

describe('getSavingsMessage', () => {
	it('returns null for free plan', () => {
		expect(getSavingsMessage(PLANS.free)).toBeNull();
	});

	it('returns savings message for paid plans', () => {
		const message = getSavingsMessage(PLANS.pro);
		
		expect(message).toContain('Save');
		expect(message).toContain('/year');
		expect(message).toContain('%');
	});

	it('calculates correct savings amount', () => {
		const pro = PLANS.pro;
		const expectedSavings = pro.pricing.monthly * 12 - pro.pricing.annualTotal;
		const message = getSavingsMessage(pro);
		
		expect(message).toContain(`$${expectedSavings}`);
	});
});
