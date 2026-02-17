/**
 * WIP Wizard validation and state machine tests
 */

import { describe, it, expect } from 'vitest';
import {
    wipNumberSchema,
    wipLookupSchema,
    templateSelectSchema,
    prefillOverridesSchema,
    assignSchema,
    canTransition,
    isTerminalState,
} from '../wizard-validation';

describe('wipNumberSchema', () => {
    it('accepts valid WIP numbers', () => {
        expect(wipNumberSchema.safeParse('WIP-2026-0042').success).toBe(true);
        expect(wipNumberSchema.safeParse('WIP_123').success).toBe(true);
        expect(wipNumberSchema.safeParse('ABC.DEF-456').success).toBe(true);
        expect(wipNumberSchema.safeParse('SIMPLE').success).toBe(true);
    });

    it('rejects empty string', () => {
        expect(wipNumberSchema.safeParse('').success).toBe(false);
    });

    it('rejects strings over 100 chars', () => {
        const longString = 'A'.repeat(101);
        expect(wipNumberSchema.safeParse(longString).success).toBe(false);
    });

    it('rejects strings with invalid characters', () => {
        expect(wipNumberSchema.safeParse('WIP 2026').success).toBe(false); // space
        expect(wipNumberSchema.safeParse('WIP@2026').success).toBe(false); // @
        expect(wipNumberSchema.safeParse('<script>').success).toBe(false); // XSS attempt
        expect(wipNumberSchema.safeParse('WIP; DROP TABLE').success).toBe(false); // SQL injection
    });
});

describe('wipLookupSchema', () => {
    it('accepts valid lookup payloads', () => {
        const result = wipLookupSchema.safeParse({ wipNumber: 'WIP-2026-0042' });
        expect(result.success).toBe(true);
    });

    it('rejects missing wipNumber', () => {
        expect(wipLookupSchema.safeParse({}).success).toBe(false);
        expect(wipLookupSchema.safeParse({ wipNumber: '' }).success).toBe(false);
    });
});

describe('templateSelectSchema', () => {
    it('accepts valid template selection', () => {
        const result = templateSelectSchema.safeParse({
            templateId: 'cltemplate123',
            stage: 'template_selected',
        });
        expect(result.success).toBe(true);
    });

    it('rejects wrong stage value', () => {
        const result = templateSelectSchema.safeParse({
            templateId: 'cltemplate123',
            stage: 'wrong_stage',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing templateId', () => {
        const result = templateSelectSchema.safeParse({
            stage: 'template_selected',
        });
        expect(result.success).toBe(false);
    });
});

describe('prefillOverridesSchema', () => {
    it('accepts empty overrides', () => {
        expect(prefillOverridesSchema.safeParse({}).success).toBe(true);
    });

    it('accepts valid overrides', () => {
        const result = prefillOverridesSchema.safeParse({
            overrides: { 'uuid-1': 'Acme Corp', 'uuid-2': '50000' },
        });
        expect(result.success).toBe(true);
    });
});

describe('assignSchema', () => {
    it('accepts valid assignment payload', () => {
        const result = assignSchema.safeParse({
            endCustomerEmail: 'test@example.com',
            endCustomerName: 'Test User',
            dueDate: '2026-03-15T00:00:00.000Z',
            sendInvite: true,
        });
        expect(result.success).toBe(true);
    });

    it('accepts minimal payload (email only)', () => {
        const result = assignSchema.safeParse({
            endCustomerEmail: 'test@example.com',
        });
        expect(result.success).toBe(true);
    });

    it('defaults sendInvite to true', () => {
        const result = assignSchema.safeParse({
            endCustomerEmail: 'test@example.com',
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sendInvite).toBe(true);
        }
    });

    it('rejects invalid email', () => {
        const result = assignSchema.safeParse({
            endCustomerEmail: 'not-an-email',
        });
        expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
        expect(assignSchema.safeParse({}).success).toBe(false);
    });
});

describe('canTransition (state machine)', () => {
    describe('from wip_lookup', () => {
        it('can go to template_selected', () => {
            expect(canTransition('wip_lookup', 'template_selected')).toBe(true);
        });

        it('can go to cancelled', () => {
            expect(canTransition('wip_lookup', 'cancelled')).toBe(true);
        });

        it('can go to error', () => {
            expect(canTransition('wip_lookup', 'error')).toBe(true);
        });

        it('cannot skip to prefilled', () => {
            expect(canTransition('wip_lookup', 'prefilled')).toBe(false);
        });

        it('cannot skip to assigned', () => {
            expect(canTransition('wip_lookup', 'assigned')).toBe(false);
        });
    });

    describe('from template_selected', () => {
        it('can go to prefilled', () => {
            expect(canTransition('template_selected', 'prefilled')).toBe(true);
        });

        it('can go back to wip_lookup', () => {
            expect(canTransition('template_selected', 'wip_lookup')).toBe(true);
        });

        it('can go to cancelled', () => {
            expect(canTransition('template_selected', 'cancelled')).toBe(true);
        });

        it('cannot skip to assigned', () => {
            expect(canTransition('template_selected', 'assigned')).toBe(false);
        });
    });

    describe('from prefilled', () => {
        it('can go to assigned', () => {
            expect(canTransition('prefilled', 'assigned')).toBe(true);
        });

        it('can go back to template_selected', () => {
            expect(canTransition('prefilled', 'template_selected')).toBe(true);
        });

        it('can go to cancelled', () => {
            expect(canTransition('prefilled', 'cancelled')).toBe(true);
        });
    });

    describe('terminal states', () => {
        it('assigned has no valid transitions', () => {
            expect(canTransition('assigned', 'wip_lookup')).toBe(false);
            expect(canTransition('assigned', 'cancelled')).toBe(false);
        });

        it('cancelled has no valid transitions', () => {
            expect(canTransition('cancelled', 'wip_lookup')).toBe(false);
            expect(canTransition('cancelled', 'assigned')).toBe(false);
        });
    });

    describe('error recovery', () => {
        it('can retry from error back to wip_lookup', () => {
            expect(canTransition('error', 'wip_lookup')).toBe(true);
        });

        it('can cancel from error', () => {
            expect(canTransition('error', 'cancelled')).toBe(true);
        });

        it('cannot jump from error to assigned', () => {
            expect(canTransition('error', 'assigned')).toBe(false);
        });
    });
});

describe('isTerminalState', () => {
    it('assigned is terminal', () => {
        expect(isTerminalState('assigned')).toBe(true);
    });

    it('cancelled is terminal', () => {
        expect(isTerminalState('cancelled')).toBe(true);
    });

    it('wip_lookup is not terminal', () => {
        expect(isTerminalState('wip_lookup')).toBe(false);
    });

    it('template_selected is not terminal', () => {
        expect(isTerminalState('template_selected')).toBe(false);
    });

    it('prefilled is not terminal', () => {
        expect(isTerminalState('prefilled')).toBe(false);
    });

    it('error is not terminal', () => {
        expect(isTerminalState('error')).toBe(false);
    });
});
