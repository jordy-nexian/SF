/**
 * Billing utility tests
 * Tests for feature checks and limit enforcement logic.
 * Note: Functions that require DB (checkLimit, enforceLimit) are tested via mocks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkFeature, enforceFeature } from '../billing';
import { PLANS } from '../plans';

// Mock the plans module to have full control over plan data
vi.mock('../plans', async () => {
    const actual = await vi.importActual('../plans');
    return {
        ...actual,
        getPlan: vi.fn((planId: string) => {
            const plans: Record<string, any> = {
                free: {
                    id: 'free',
                    name: 'Free',
                    limits: {
                        webhookFailover: false,
                        customDomain: false,
                        abTesting: false,
                        removeBranding: false,
                        apiAccess: false,
                    },
                },
                pro: {
                    id: 'pro',
                    name: 'Pro',
                    limits: {
                        webhookFailover: true,
                        customDomain: true,
                        abTesting: true,
                        removeBranding: true,
                        apiAccess: false,
                    },
                },
                enterprise: {
                    id: 'enterprise',
                    name: 'Enterprise',
                    limits: {
                        webhookFailover: true,
                        customDomain: true,
                        abTesting: true,
                        removeBranding: true,
                        apiAccess: true,
                    },
                },
            };
            return plans[planId] || plans.free;
        }),
    };
});

describe('checkFeature', () => {
    it('returns false for free plan features', () => {
        expect(checkFeature('free', 'webhookFailover')).toBe(false);
        expect(checkFeature('free', 'customDomain')).toBe(false);
        expect(checkFeature('free', 'abTesting')).toBe(false);
        expect(checkFeature('free', 'removeBranding')).toBe(false);
        expect(checkFeature('free', 'apiAccess')).toBe(false);
    });

    it('returns true for pro plan features', () => {
        expect(checkFeature('pro', 'webhookFailover')).toBe(true);
        expect(checkFeature('pro', 'customDomain')).toBe(true);
        expect(checkFeature('pro', 'abTesting')).toBe(true);
        expect(checkFeature('pro', 'removeBranding')).toBe(true);
    });

    it('returns false for pro plan without apiAccess', () => {
        expect(checkFeature('pro', 'apiAccess')).toBe(false);
    });

    it('returns true for enterprise plan with all features', () => {
        expect(checkFeature('enterprise', 'webhookFailover')).toBe(true);
        expect(checkFeature('enterprise', 'customDomain')).toBe(true);
        expect(checkFeature('enterprise', 'abTesting')).toBe(true);
        expect(checkFeature('enterprise', 'removeBranding')).toBe(true);
        expect(checkFeature('enterprise', 'apiAccess')).toBe(true);
    });
});

describe('enforceFeature', () => {
    it('does not throw when feature is available', () => {
        expect(() => enforceFeature('pro', 'webhookFailover')).not.toThrow();
        expect(() => enforceFeature('enterprise', 'apiAccess')).not.toThrow();
    });

    it('throws when feature is not available on free plan', () => {
        expect(() => enforceFeature('free', 'webhookFailover')).toThrow();
        expect(() => enforceFeature('free', 'customDomain')).toThrow();
    });

    it('throws when feature is not available on pro plan', () => {
        expect(() => enforceFeature('pro', 'apiAccess')).toThrow();
    });

    it('throws with FEATURE_NOT_AVAILABLE code', () => {
        try {
            enforceFeature('free', 'abTesting');
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.code).toBe('FEATURE_NOT_AVAILABLE');
        }
    });

    it('includes feature name in error message', () => {
        try {
            enforceFeature('free', 'customDomain');
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.message).toContain('Custom domains');
        }
    });

    it('includes upgrade suggestion in error message', () => {
        try {
            enforceFeature('free', 'webhookFailover');
            expect.fail('Should have thrown');
        } catch (err: any) {
            expect(err.message).toContain('upgrade');
        }
    });
});
