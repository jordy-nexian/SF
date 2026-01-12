/**
 * Schema validation tests
 */

import { describe, it, expect } from 'vitest';
import { validateSubmission, type ValidationResult } from '../schema-validation';
import type { FormSchema } from '@/types/form-schema';

// Helper to create a minimal form schema
function createSchema(fields: FormSchema['fields']): FormSchema {
	return {
		id: 'test-schema',
		version: 1,
		title: 'Test Form',
		fields,
	};
}

describe('validateSubmission', () => {
	describe('required fields', () => {
		it('passes when required field has value', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name', required: true },
			]);

			const result = validateSubmission(schema, { name: 'John' });

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('fails when required field is missing', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name', required: true },
			]);

			const result = validateSubmission(schema, {});

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: 'name' })
			);
		});

		it('fails when required field is empty string', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name', required: true },
			]);

			const result = validateSubmission(schema, { name: '' });

			expect(result.valid).toBe(false);
		});

		it('passes when optional field is missing', () => {
			const schema = createSchema([
				{ key: 'nickname', type: 'text', label: 'Nickname', required: false },
			]);

			const result = validateSubmission(schema, {});

			expect(result.valid).toBe(true);
		});
	});

	describe('email validation', () => {
		it('passes for valid email', () => {
			const schema = createSchema([
				{ key: 'email', type: 'email', label: 'Email' },
			]);

			const result = validateSubmission(schema, { email: 'test@example.com' });

			expect(result.valid).toBe(true);
		});

		it('fails for invalid email', () => {
			const schema = createSchema([
				{ key: 'email', type: 'email', label: 'Email' },
			]);

			const result = validateSubmission(schema, { email: 'not-an-email' });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'email',
					message: 'Invalid email address.'
				})
			);
		});

		it('fails for email without domain', () => {
			const schema = createSchema([
				{ key: 'email', type: 'email', label: 'Email' },
			]);

			const result = validateSubmission(schema, { email: 'test@' });

			expect(result.valid).toBe(false);
		});
	});

	describe('number validation', () => {
		it('passes for valid number', () => {
			const schema = createSchema([
				{ key: 'age', type: 'number', label: 'Age' },
			]);

			const result = validateSubmission(schema, { age: 25 });

			expect(result.valid).toBe(true);
		});

		it('fails for NaN', () => {
			const schema = createSchema([
				{ key: 'age', type: 'number', label: 'Age' },
			]);

			const result = validateSubmission(schema, { age: NaN });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'age',
					message: 'Must be a valid number.'
				})
			);
		});

		it('passes for zero', () => {
			const schema = createSchema([
				{ key: 'count', type: 'number', label: 'Count' },
			]);

			const result = validateSubmission(schema, { count: 0 });

			expect(result.valid).toBe(true);
		});

		it('passes for negative numbers', () => {
			const schema = createSchema([
				{ key: 'balance', type: 'number', label: 'Balance' },
			]);

			const result = validateSubmission(schema, { balance: -100 });

			expect(result.valid).toBe(true);
		});
	});

	describe('select/radio validation', () => {
		it('passes for valid option', () => {
			const schema = createSchema([
				{
					key: 'color',
					type: 'select',
					label: 'Color',
					options: [
						{ value: 'red', label: 'Red' },
						{ value: 'blue', label: 'Blue' },
					],
				},
			]);

			const result = validateSubmission(schema, { color: 'red' });

			expect(result.valid).toBe(true);
		});

		it('fails for invalid option', () => {
			const schema = createSchema([
				{
					key: 'color',
					type: 'select',
					label: 'Color',
					options: [
						{ value: 'red', label: 'Red' },
						{ value: 'blue', label: 'Blue' },
					],
				},
			]);

			const result = validateSubmission(schema, { color: 'green' });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'color',
					message: 'Invalid selection.'
				})
			);
		});
	});

	describe('checkboxGroup validation', () => {
		it('passes for valid selections', () => {
			const schema = createSchema([
				{
					key: 'interests',
					type: 'checkboxGroup',
					label: 'Interests',
					options: [
						{ value: 'sports', label: 'Sports' },
						{ value: 'music', label: 'Music' },
						{ value: 'art', label: 'Art' },
					],
				},
			]);

			const result = validateSubmission(schema, { interests: ['sports', 'music'] });

			expect(result.valid).toBe(true);
		});

		it('fails for invalid selections', () => {
			const schema = createSchema([
				{
					key: 'interests',
					type: 'checkboxGroup',
					label: 'Interests',
					options: [
						{ value: 'sports', label: 'Sports' },
						{ value: 'music', label: 'Music' },
					],
				},
			]);

			const result = validateSubmission(schema, { interests: ['sports', 'hacking'] });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'interests',
					message: 'Invalid selection.'
				})
			);
		});
	});

	describe('date validation', () => {
		it('passes for valid date format', () => {
			const schema = createSchema([
				{ key: 'birthdate', type: 'date', label: 'Birth Date' },
			]);

			const result = validateSubmission(schema, { birthdate: '1990-05-15' });

			expect(result.valid).toBe(true);
		});

		it('fails for invalid date format', () => {
			const schema = createSchema([
				{ key: 'birthdate', type: 'date', label: 'Birth Date' },
			]);

			const result = validateSubmission(schema, { birthdate: '15/05/1990' });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'birthdate',
					message: 'Invalid date format.'
				})
			);
		});

		it('fails for invalid date values', () => {
			const schema = createSchema([
				{ key: 'birthdate', type: 'date', label: 'Birth Date' },
			]);

			const result = validateSubmission(schema, { birthdate: '2024-13-45' });

			expect(result.valid).toBe(false);
		});
	});

	describe('unknown fields', () => {
		it('fails for unknown fields (potential injection)', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name' },
			]);

			const result = validateSubmission(schema, { 
				name: 'John',
				malicious: '<script>alert("xss")</script>',
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ 
					field: 'malicious',
					message: 'Unknown field.'
				})
			);
		});

		it('allows all known fields', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name' },
				{ key: 'email', type: 'email', label: 'Email' },
			]);

			const result = validateSubmission(schema, { 
				name: 'John',
				email: 'john@example.com',
			});

			expect(result.valid).toBe(true);
		});
	});

	describe('multiple fields', () => {
		it('validates all fields and returns all errors', () => {
			const schema = createSchema([
				{ key: 'name', type: 'text', label: 'Name', required: true },
				{ key: 'email', type: 'email', label: 'Email', required: true },
				{ key: 'age', type: 'number', label: 'Age' },
			]);

			const result = validateSubmission(schema, { 
				email: 'invalid',
				age: NaN,
			});

			expect(result.valid).toBe(false);
			// Should have errors for: name (required), email (invalid), age (NaN)
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('visibility conditions', () => {
		it('skips hidden fields in validation', () => {
			const schema = createSchema([
				{ key: 'hasPhone', type: 'boolean', label: 'Has Phone' },
				{ 
					key: 'phone', 
					type: 'text', 
					label: 'Phone', 
					required: true,
					visibilityCondition: {
						field: 'hasPhone',
						operator: 'equals',
						value: true,
					},
				},
			]);

			// Phone is required but hidden because hasPhone is false
			const result = validateSubmission(schema, { hasPhone: false });

			expect(result.valid).toBe(true);
		});

		it('validates visible conditional fields', () => {
			const schema = createSchema([
				{ key: 'hasPhone', type: 'boolean', label: 'Has Phone' },
				{ 
					key: 'phone', 
					type: 'text', 
					label: 'Phone', 
					required: true,
					visibilityCondition: {
						field: 'hasPhone',
						operator: 'equals',
						value: true,
					},
				},
			]);

			// Phone is required and visible because hasPhone is true
			const result = validateSubmission(schema, { hasPhone: true });

			expect(result.valid).toBe(false);
			expect(result.errors).toContainEqual(
				expect.objectContaining({ field: 'phone' })
			);
		});
	});
});
