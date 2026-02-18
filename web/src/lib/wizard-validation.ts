/**
 * WIP Wizard validation schemas and state machine utilities.
 */

import { z } from 'zod';

// --- Zod Schemas ---

export const wipNumberSchema = z
    .string()
    .min(1, 'WIP number is required')
    .max(100, 'WIP number too long')
    .regex(/^[\w\-\.]+$/, 'WIP number contains invalid characters');

export const wipLookupSchema = z.object({
    wipNumber: wipNumberSchema,
});

export const templateSelectSchema = z.object({
    templateId: z.string().min(1, 'Template ID is required'),
    stage: z.literal('template_selected'),
});

export const prefillOverridesSchema = z.object({
    overrides: z.record(z.string(), z.string()).optional(),
});

export const assignSchema = z.object({
    endCustomerEmail: z.string().email('Valid email is required'),
    endCustomerName: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    sendInvite: z.boolean().default(true),
});

// --- State Machine ---

type WizardState = 'wip_lookup' | 'template_selected' | 'prefilled' | 'assigned' | 'cancelled' | 'error';

const VALID_TRANSITIONS: Record<WizardState, WizardState[]> = {
    wip_lookup: ['template_selected', 'cancelled', 'error'],
    template_selected: ['prefilled', 'wip_lookup', 'cancelled', 'error'],  // allow going back to re-lookup
    prefilled: ['assigned', 'template_selected', 'cancelled', 'error'],   // allow going back to re-select
    assigned: [],  // terminal state
    cancelled: [], // terminal state
    error: ['wip_lookup', 'cancelled'], // can retry from error
};

export function canTransition(from: WizardState, to: WizardState): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalState(state: WizardState): boolean {
    return state === 'assigned' || state === 'cancelled';
}

// --- n8n Webhook Helpers ---

export interface WipLookupPayload {
    action: 'wip_lookup';
    wipNumber: string;
    tenantId: string;
}

export interface WipPrefillPayload {
    action: 'wip_prefill';
    wipNumber: string;
    tenantId: string;
    fields: Array<{
        key: string;
        label: string;
        tokenId: string;
    }>;
}

// n8n returns an array of Quickbase records, e.g.:
// [{"WIPNumber": 54321, "CompanyName": "Brunel University", ...}]
export interface N8nWipLookupRecord {
    WIPNumber: number | string;
    CompanyName?: string;
    [key: string]: unknown; // any extra fields from Quickbase
}

// Raw response is an array; we normalise it in wizard-n8n.ts
export type N8nWipLookupRawResponse = N8nWipLookupRecord[];

export interface N8nPrefillResponse {
    success: boolean;
    values?: Record<string, string>;
    unmapped?: string[];
    error?: string;
}
