/**
 * Shared form schema types used across the application.
 * Single source of truth for form structure definitions.
 */

export type FieldType =
	| "text"
	| "textarea"
	| "email"
	| "number"
	| "boolean"
	| "select"
	| "radio"
	| "checkboxGroup"
	| "date"
	| "repeatable";

export type ValidationRule = {
	minLength?: number;
	maxLength?: number;
	pattern?: string;
	min?: number;
	max?: number;
	required?: boolean;
};

export type VisibilityOperator =
	| "equals"
	| "not_equals"
	| "greater_than"
	| "less_than"
	| "in";

export type VisibilityCondition = {
	field: string;
	operator: VisibilityOperator;
	value: unknown;
};

export type FieldOption = {
	value: string;
	label: string;
};

export type Field = {
	key: string;
	type: FieldType;
	label: string;
	helpText?: string;
	required?: boolean;
	validation?: ValidationRule;
	options?: FieldOption[];
	visibilityCondition?: VisibilityCondition;
	itemFields?: Field[]; // for repeatable sections
};

export type Step = {
	id: string;
	title: string;
	description?: string;
	fields: string[]; // references to Field.key
	visibilityCondition?: VisibilityCondition;
};

export type FormSchema = {
	id: string;
	version: number;
	title: string;
	description?: string;
	steps?: Step[];
	fields: Field[];
};

/**
 * Utility: Get value from nested object by dot/bracket path.
 * e.g., "items[0].name" → obj.items[0].name
 */
export function getByPath(obj: unknown, path: string): unknown {
	if (!path || obj == null) return undefined;
	const parts = path
		.replace(/\[(\d+)\]/g, ".$1")
		.split(".")
		.filter(Boolean);
	return parts.reduce(
		(acc: unknown, p: string) =>
			acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[p] : undefined,
		obj
	);
}

/**
 * Evaluate a visibility condition against current form values.
 */
export function evaluateVisibility(
	cond: VisibilityCondition | undefined,
	values: Record<string, unknown>
): boolean {
	if (!cond) return true;
	const left = getByPath(values, cond.field);
	const right = cond.value;
	switch (cond.operator) {
		case "equals":
			return left === right;
		case "not_equals":
			return left !== right;
		case "greater_than":
			return Number(left) > Number(right);
		case "less_than":
			return Number(left) < Number(right);
		case "in":
			return Array.isArray(right) ? right.includes(left) : false;
		default:
			return true;
	}
}

/**
 * Validate a single field value against its rules.
 * Returns error message or null if valid.
 */
export function validateField(field: Field, value: unknown): string | null {
	const rules = field.validation ?? {};
	const isRequired = field.required || rules.required;

	// Required check
	if (isRequired) {
		if (value == null || value === "") return "This field is required.";
		if (Array.isArray(value) && value.length === 0) return "This field is required.";
	}

	// String validations
	if (typeof value === "string" && value !== "") {
		if (rules.minLength != null && value.length < rules.minLength) {
			return `Minimum length is ${rules.minLength}.`;
		}
		if (rules.maxLength != null && value.length > rules.maxLength) {
			return `Maximum length is ${rules.maxLength}.`;
		}
		if (rules.pattern) {
			try {
				const re = new RegExp(rules.pattern);
				if (!re.test(value)) return "Invalid format.";
			} catch {
				// Ignore invalid regex patterns
			}
		}
	}

	// Number validations
	if (typeof value === "number" && !Number.isNaN(value)) {
		if (rules.min != null && value < rules.min) {
			return `Minimum value is ${rules.min}.`;
		}
		if (rules.max != null && value > rules.max) {
			return `Maximum value is ${rules.max}.`;
		}
	}

	return null;
}












