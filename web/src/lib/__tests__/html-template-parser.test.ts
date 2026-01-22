/**
 * Unit tests for HTML Template Parser
 */
import { describe, it, expect } from 'vitest';
import {
    extractTokensFromHtml,
    replaceTokensWithValues,
    tokensToFormSchema,
    applyMappingsToPayload,
} from '../html-template-parser';

// Sample HTML similar to ApplicationForm.html
const sampleHtml = `
<h1><strong>Mercia Application Form</strong></h1>
<table>
  <tr>
    <td>Company Name</td>
    <td><span class="fe-token" data-token-id="a2737319-6045-4d84-b748-1e137a14930b">Organisation - Company Name</span></td>
  </tr>
  <tr>
    <td>Company Number</td>
    <td><span class="fe-token" data-token-id="da3d7a8b-42b3-4d0c-a63d-5c841448bc63">Organisation - Company Number</span></td>
  </tr>
  <tr>
    <td>Email address</td>
    <td><span class="fe-token" data-token-id="3e0e60d8-7b11-4b06-bbae-027b02859171" style="width:300px">Main Contact - Email address</span></td>
  </tr>
</table>
`;

describe('extractTokensFromHtml', () => {
    it('should extract all fe-token spans from HTML', () => {
        const tokens = extractTokensFromHtml(sampleHtml);

        expect(tokens).toHaveLength(3);
        expect(tokens[0]).toEqual({
            tokenId: 'a2737319-6045-4d84-b748-1e137a14930b',
            label: 'Organisation - Company Name',
            position: expect.any(Number),
        });
        expect(tokens[1].tokenId).toBe('da3d7a8b-42b3-4d0c-a63d-5c841448bc63');
        expect(tokens[2].label).toBe('Main Contact - Email address');
    });

    it('should return empty array for HTML without tokens', () => {
        const tokens = extractTokensFromHtml('<div>No tokens here</div>');
        expect(tokens).toHaveLength(0);
    });

    it('should handle malformed HTML gracefully', () => {
        const tokens = extractTokensFromHtml('<div><span class="fe-token" data-token-id="123">Test');
        // Malformed - no closing tag, should still try to extract
        expect(tokens).toHaveLength(0); // Won't match without closing tag
    });

    it('should extract tokens in document order', () => {
        const tokens = extractTokensFromHtml(sampleHtml);

        for (let i = 1; i < tokens.length; i++) {
            expect(tokens[i].position).toBeGreaterThan(tokens[i - 1].position);
        }
    });
});

describe('replaceTokensWithValues', () => {
    it('should replace token content with provided values', () => {
        const values = {
            'a2737319-6045-4d84-b748-1e137a14930b': 'Acme Corporation',
        };

        const result = replaceTokensWithValues(sampleHtml, values);

        expect(result).toContain('Acme Corporation');
        expect(result).not.toContain('Organisation - Company Name');
        // Other tokens should remain unchanged
        expect(result).toContain('Organisation - Company Number');
    });

    it('should escape HTML in values', () => {
        const values = {
            'a2737319-6045-4d84-b748-1e137a14930b': '<script>alert("xss")</script>',
        };

        const result = replaceTokensWithValues(sampleHtml, values);

        expect(result).toContain('&lt;script&gt;');
        expect(result).not.toContain('<script>');
    });

    it('should keep original content when no value provided', () => {
        const result = replaceTokensWithValues(sampleHtml, {});

        expect(result).toContain('Organisation - Company Name');
    });
});

describe('tokensToFormSchema', () => {
    it('should convert tokens to form fields', () => {
        const tokens = extractTokensFromHtml(sampleHtml);
        const schema = tokensToFormSchema(tokens);

        expect(schema).toHaveLength(3);
        expect(schema[0]).toMatchObject({
            key: 'a2737319-6045-4d84-b748-1e137a14930b',
            label: 'Organisation - Company Name',
            type: 'text',
        });
    });

    it('should infer email type from label', () => {
        const tokens = extractTokensFromHtml(sampleHtml);
        const schema = tokensToFormSchema(tokens);

        const emailField = schema.find(f => f.label.includes('Email'));
        expect(emailField?.type).toBe('email');
    });

    it('should apply mappings to keys', () => {
        const tokens = extractTokensFromHtml(sampleHtml);
        const mappings = {
            'a2737319-6045-4d84-b748-1e137a14930b': 'company_name',
        };
        const schema = tokensToFormSchema(tokens, mappings);

        expect(schema[0].key).toBe('company_name');
    });
});

describe('applyMappingsToPayload', () => {
    it('should map payload keys to token IDs', () => {
        const payload = {
            company_name: 'Acme Corp',
            company_number: '12345678',
        };

        const mappings = [
            { tokenId: 'token-1', payloadKey: 'company_name' },
            { tokenId: 'token-2', payloadKey: 'company_number' },
        ];

        const result = applyMappingsToPayload(payload, mappings);

        expect(result).toEqual({
            'token-1': 'Acme Corp',
            'token-2': '12345678',
        });
    });

    it('should skip undefined payload values', () => {
        const payload = {
            company_name: 'Acme Corp',
        };

        const mappings = [
            { tokenId: 'token-1', payloadKey: 'company_name' },
            { tokenId: 'token-2', payloadKey: 'missing_field' },
        ];

        const result = applyMappingsToPayload(payload, mappings);

        expect(result).toEqual({
            'token-1': 'Acme Corp',
        });
        expect(result['token-2']).toBeUndefined();
    });

    it('should convert non-string values to strings', () => {
        const payload = {
            amount: 50000,
            active: true,
        };

        const mappings = [
            { tokenId: 'token-1', payloadKey: 'amount' },
            { tokenId: 'token-2', payloadKey: 'active' },
        ];

        const result = applyMappingsToPayload(payload, mappings);

        expect(result['token-1']).toBe('50000');
        expect(result['token-2']).toBe('true');
    });
});
