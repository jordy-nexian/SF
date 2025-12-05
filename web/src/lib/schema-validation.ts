/**
 * Server-side form schema validation.
 * Validates submission answers against the form's schema.
 */

import type { FormSchema, Field } from "@/types/form-schema";
import { evaluateVisibility, validateField as validateFieldRule } from "@/types/form-schema";

export type ValidationError = {
	field: string;
	message: string;
};

export type ValidationResult = {
	valid: boolean;
	errors: ValidationError[];
};

/**
 * Validate submission answers against a form schema.
 * @param schema The form schema
 * @param answers The submitted answers
 * @returns Validation result with any errors
 */
export function validateSubmission(
	schema: FormSchema,
	answers: Record<string, unknown>
): ValidationResult {
	const errors: ValidationError[] = [];

	// Get all visible fields (respecting visibility conditions)
	const visibleFields = schema.fields.filter((field) =>
		evaluateVisibility(field.visibilityCondition, answers)
	);

	for (const field of visibleFields) {
		const value = answers[field.key];

		// Handle repeatable fields
		if (field.type === "repeatable" && field.itemFields) {
			if (field.required && (!Array.isArray(value) || value.length === 0)) {
				errors.push({
					field: field.key,
					message: "At least one item is required.",
				});
				continue;
			}

			if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item !== "object" || item === null) return;

					for (const subField of field.itemFields!) {
						const subValue = (item as Record<string, unknown>)[subField.key];
						const error = validateFieldRule(subField, subValue);
						if (error) {
							errors.push({
								field: `${field.key}[${index}].${subField.key}`,
								message: error,
							});
						}
					}
				});
			}
			continue;
		}

		// Validate regular fields
		const error = validateFieldRule(field, value);
		if (error) {
			errors.push({ field: field.key, message: error });
		}

		// Type-specific validations
		if (value !== undefined && value !== null && value !== "") {
			switch (field.type) {
				case "email":
					if (typeof value === "string" && !isValidEmail(value)) {
						errors.push({ field: field.key, message: "Invalid email address." });
					}
					break;
				case "number":
					if (typeof value !== "number" || Number.isNaN(value)) {
						errors.push({ field: field.key, message: "Must be a valid number." });
					}
					break;
				case "select":
				case "radio":
					if (field.options && typeof value === "string") {
						const validValues = field.options.map((o) => o.value);
						if (!validValues.includes(value)) {
							errors.push({ field: field.key, message: "Invalid selection." });
						}
					}
					break;
				case "checkboxGroup":
					if (field.options && Array.isArray(value)) {
						const validValues = field.options.map((o) => o.value);
						const invalid = value.some((v) => !validValues.includes(v as string));
						if (invalid) {
							errors.push({ field: field.key, message: "Invalid selection." });
						}
					}
					break;
				case "date":
					if (typeof value === "string" && !isValidDate(value)) {
						errors.push({ field: field.key, message: "Invalid date format." });
					}
					break;
			}
		}
	}

	// Check for unexpected fields (potential injection)
	const knownKeys = new Set(schema.fields.map((f) => f.key));
	for (const key of Object.keys(answers)) {
		if (!knownKeys.has(key)) {
			errors.push({ field: key, message: "Unknown field." });
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

function isValidEmail(email: string): boolean {
	// Basic email validation
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(date: string): boolean {
	// Validate YYYY-MM-DD format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	const d = new Date(date);
	return !Number.isNaN(d.getTime());
}






