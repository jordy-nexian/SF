/**
 * Payload transformation for webhook submissions.
 * Allows customizing the structure sent to n8n.
 */

export type TransformTemplate = {
	// JSON template with placeholders like {{answers.email}}
	template: string;
	// Whether to merge with default payload or replace entirely
	mode: "merge" | "replace";
};

/**
 * Get value from object using dot notation path.
 */
function getPath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Replace placeholders in template with actual values.
 * Supports {{path.to.value}} syntax.
 */
function interpolate(template: string, context: Record<string, unknown>): string {
	return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
		const value = getPath(context, path.trim());
		if (value === undefined || value === null) return "";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	});
}

/**
 * Apply transformation template to payload.
 */
export function transformPayload(
	originalPayload: Record<string, unknown>,
	transform: TransformTemplate | null | undefined
): Record<string, unknown> {
	if (!transform?.template) {
		return originalPayload;
	}

	try {
		// Interpolate the template
		const interpolated = interpolate(transform.template, originalPayload);

		// Parse as JSON
		const transformed = JSON.parse(interpolated);

		if (transform.mode === "replace") {
			return transformed;
		}

		// Merge mode: deep merge with original
		return deepMerge(originalPayload, transformed);
	} catch (err) {
		console.error("Payload transformation failed:", err);
		// Return original on error
		return originalPayload;
	}
}

/**
 * Deep merge two objects.
 */
function deepMerge(
	target: Record<string, unknown>,
	source: Record<string, unknown>
): Record<string, unknown> {
	const result = { ...target };

	for (const key of Object.keys(source)) {
		const sourceValue = source[key];
		const targetValue = result[key];

		if (
			sourceValue &&
			typeof sourceValue === "object" &&
			!Array.isArray(sourceValue) &&
			targetValue &&
			typeof targetValue === "object" &&
			!Array.isArray(targetValue)
		) {
			result[key] = deepMerge(
				targetValue as Record<string, unknown>,
				sourceValue as Record<string, unknown>
			);
		} else {
			result[key] = sourceValue;
		}
	}

	return result;
}

/**
 * Validate transformation template.
 */
export function validateTransformTemplate(
	template: unknown
): { valid: boolean; error?: string } {
	if (!template || typeof template !== "object") {
		return { valid: true }; // Empty is valid
	}

	const t = template as TransformTemplate;

	if (typeof t.template !== "string") {
		return { valid: false, error: "template must be a string" };
	}

	if (!["merge", "replace"].includes(t.mode)) {
		return { valid: false, error: "mode must be 'merge' or 'replace'" };
	}

	// Try to parse the template (with dummy values)
	try {
		const interpolated = t.template.replace(/\{\{[^}]+\}\}/g, '"test"');
		JSON.parse(interpolated);
	} catch {
		return { valid: false, error: "template is not valid JSON" };
	}

	return { valid: true };
}

// Example transform templates for documentation
export const EXAMPLE_TRANSFORMS = {
	// Flatten answers to top level
	flatten: {
		template: `{
  "email": "{{answers.email}}",
  "name": "{{answers.name}}",
  "message": "{{answers.message}}",
  "source": "form",
  "formId": "{{formId}}"
}`,
		mode: "replace" as const,
	},

	// Add custom metadata
	addMetadata: {
		template: `{
  "source": "stateless-forms",
  "campaign": "website",
  "priority": "normal"
}`,
		mode: "merge" as const,
	},

	// CRM-style format
	crmFormat: {
		template: `{
  "contact": {
    "email": "{{answers.email}}",
    "firstName": "{{answers.firstName}}",
    "lastName": "{{answers.lastName}}",
    "phone": "{{answers.phone}}"
  },
  "inquiry": {
    "type": "{{answers.inquiryType}}",
    "message": "{{answers.message}}",
    "source": "web_form"
  },
  "metadata": {
    "formId": "{{formId}}",
    "submissionId": "{{submissionId}}",
    "timestamp": "{{submittedAt}}"
  }
}`,
		mode: "replace" as const,
	},
};



