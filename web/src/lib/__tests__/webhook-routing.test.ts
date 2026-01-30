/**
 * Webhook routing tests
 * Tests for conditional webhook URL resolution based on form answers.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveWebhookUrl,
    validateRoutingConfig,
    type WebhookRoutingConfig,
    type WebhookRoutingRule,
} from '../webhook-routing';

describe('resolveWebhookUrl', () => {
    const defaultUrl = 'https://default.webhook.url';

    it('returns default URL when config is null', () => {
        const result = resolveWebhookUrl(null, {}, defaultUrl);
        expect(result.url).toBe(defaultUrl);
        expect(result.ruleName).toBeUndefined();
    });

    it('returns default URL when config is undefined', () => {
        const result = resolveWebhookUrl(undefined, {}, defaultUrl);
        expect(result.url).toBe(defaultUrl);
    });

    it('returns default URL when rules array is empty', () => {
        const config: WebhookRoutingConfig = { rules: [] };
        const result = resolveWebhookUrl(config, {}, defaultUrl);
        expect(result.url).toBe(defaultUrl);
    });

    it('matches equals condition', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'VIP Route',
                condition: { field: 'status', operator: 'equals', value: 'vip' },
                webhookUrl: 'https://vip.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { status: 'vip' }, defaultUrl);
        expect(result.url).toBe('https://vip.webhook.url');
        expect(result.ruleName).toBe('VIP Route');
    });

    it('does not match when equals condition fails', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'VIP Route',
                condition: { field: 'status', operator: 'equals', value: 'vip' },
                webhookUrl: 'https://vip.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { status: 'regular' }, defaultUrl);
        expect(result.url).toBe(defaultUrl);
        expect(result.ruleName).toBeUndefined();
    });

    it('matches not_equals condition', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Non-VIP Route',
                condition: { field: 'status', operator: 'not_equals', value: 'vip' },
                webhookUrl: 'https://non-vip.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { status: 'regular' }, defaultUrl);
        expect(result.url).toBe('https://non-vip.webhook.url');
    });

    it('matches contains condition for strings', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Gmail Route',
                condition: { field: 'email', operator: 'contains', value: 'gmail' },
                webhookUrl: 'https://gmail.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { email: 'user@gmail.com' }, defaultUrl);
        expect(result.url).toBe('https://gmail.webhook.url');
    });

    it('matches contains condition case-insensitively', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Gmail Route',
                condition: { field: 'email', operator: 'contains', value: 'GMAIL' },
                webhookUrl: 'https://gmail.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { email: 'user@gmail.com' }, defaultUrl);
        expect(result.url).toBe('https://gmail.webhook.url');
    });

    it('matches greater_than condition', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'High Value Route',
                condition: { field: 'amount', operator: 'greater_than', value: 1000 },
                webhookUrl: 'https://high-value.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { amount: 1500 }, defaultUrl);
        expect(result.url).toBe('https://high-value.webhook.url');
    });

    it('matches less_than condition', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Low Value Route',
                condition: { field: 'amount', operator: 'less_than', value: 100 },
                webhookUrl: 'https://low-value.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { amount: 50 }, defaultUrl);
        expect(result.url).toBe('https://low-value.webhook.url');
    });

    it('matches in condition with array', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Priority Countries',
                condition: { field: 'country', operator: 'in', value: ['US', 'UK', 'CA'] },
                webhookUrl: 'https://priority.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { country: 'UK' }, defaultUrl);
        expect(result.url).toBe('https://priority.webhook.url');
    });

    it('uses fallback URL when no rules match', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'VIP Route',
                condition: { field: 'status', operator: 'equals', value: 'vip' },
                webhookUrl: 'https://vip.webhook.url',
            }],
            fallbackUrl: 'https://fallback.webhook.url',
        };

        const result = resolveWebhookUrl(config, { status: 'regular' }, defaultUrl);
        expect(result.url).toBe('https://fallback.webhook.url');
    });

    it('respects priority ordering', () => {
        const config: WebhookRoutingConfig = {
            rules: [
                {
                    id: 'rule2',
                    name: 'Low Priority',
                    condition: { field: 'type', operator: 'equals', value: 'special' },
                    webhookUrl: 'https://low-priority.webhook.url',
                    priority: 10,
                },
                {
                    id: 'rule1',
                    name: 'High Priority',
                    condition: { field: 'type', operator: 'equals', value: 'special' },
                    webhookUrl: 'https://high-priority.webhook.url',
                    priority: 1,
                },
            ],
        };

        const result = resolveWebhookUrl(config, { type: 'special' }, defaultUrl);
        expect(result.url).toBe('https://high-priority.webhook.url');
        expect(result.ruleName).toBe('High Priority');
    });

    it('handles nested field paths', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Nested Route',
                condition: { field: 'user.role', operator: 'equals', value: 'admin' },
                webhookUrl: 'https://admin.webhook.url',
            }],
        };

        const result = resolveWebhookUrl(config, { user: { role: 'admin' } }, defaultUrl);
        expect(result.url).toBe('https://admin.webhook.url');
    });
});

describe('validateRoutingConfig', () => {
    it('returns valid for null config', () => {
        const result = validateRoutingConfig(null);
        expect(result.valid).toBe(true);
    });

    it('returns valid for undefined config', () => {
        const result = validateRoutingConfig(undefined);
        expect(result.valid).toBe(true);
    });

    it('returns valid for empty rules array', () => {
        const result = validateRoutingConfig({ rules: [] });
        expect(result.valid).toBe(true);
    });

    it('returns valid for properly structured config', () => {
        const config: WebhookRoutingConfig = {
            rules: [{
                id: 'rule1',
                name: 'Test Rule',
                condition: { field: 'status', operator: 'equals', value: 'active' },
                webhookUrl: 'https://test.webhook.url',
            }],
        };

        const result = validateRoutingConfig(config);
        expect(result.valid).toBe(true);
    });

    it('fails when rules is not an array', () => {
        const result = validateRoutingConfig({ rules: 'not-an-array' });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('rules must be an array');
    });

    it('fails when rule has missing id', () => {
        const config = {
            rules: [{
                name: 'Test Rule',
                condition: { field: 'status', operator: 'equals', value: 'active' },
                webhookUrl: 'https://test.webhook.url',
            }],
        };

        const result = validateRoutingConfig(config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('missing or invalid id');
    });

    it('fails when rule has missing webhookUrl', () => {
        const config = {
            rules: [{
                id: 'rule1',
                name: 'Test Rule',
                condition: { field: 'status', operator: 'equals', value: 'active' },
            }],
        };

        const result = validateRoutingConfig(config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('missing or invalid webhookUrl');
    });

    it('fails when rule has missing condition', () => {
        const config = {
            rules: [{
                id: 'rule1',
                name: 'Test Rule',
                webhookUrl: 'https://test.webhook.url',
            }],
        };

        const result = validateRoutingConfig(config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('missing or invalid condition');
    });

    it('fails when condition has invalid operator', () => {
        const config = {
            rules: [{
                id: 'rule1',
                name: 'Test Rule',
                condition: { field: 'status', operator: 'invalid_op', value: 'active' },
                webhookUrl: 'https://test.webhook.url',
            }],
        };

        const result = validateRoutingConfig(config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('invalid operator');
    });
});
