/**
 * Conditional webhook routing based on form answers.
 */

import { getByPath } from "@/types/form-schema";

export type WebhookRoutingRule = {
	id: string;
	name: string;
	condition: {
		field: string;
		operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in";
		value: unknown;
	};
	webhookUrl: string;
	priority?: number; // Lower = higher priority
};

export type WebhookRoutingConfig = {
	rules: WebhookRoutingRule[];
	fallbackUrl?: string; // Used if no rules match
};

/**
 * Evaluate a routing condition against form answers.
 */
function evaluateCondition(
	condition: WebhookRoutingRule["condition"],
	answers: Record<string, unknown>
): boolean {
	const fieldValue = getByPath(answers, condition.field);
	const targetValue = condition.value;

	switch (condition.operator) {
		case "equals":
			return fieldValue === targetValue;

		case "not_equals":
			return fieldValue !== targetValue;

		case "contains":
			if (typeof fieldValue === "string" && typeof targetValue === "string") {
				return fieldValue.toLowerCase().includes(targetValue.toLowerCase());
			}
			if (Array.isArray(fieldValue)) {
				return fieldValue.includes(targetValue);
			}
			return false;

		case "greater_than":
			return Number(fieldValue) > Number(targetValue);

		case "less_than":
			return Number(fieldValue) < Number(targetValue);

		case "in":
			if (Array.isArray(targetValue)) {
				return targetValue.includes(fieldValue);
			}
			return false;

		default:
			return false;
	}
}

/**
 * Determine which webhook URL to use based on routing rules and answers.
 * @param config The webhook routing configuration
 * @param answers The form submission answers
 * @param defaultUrl The default webhook URL (tenant or form level)
 * @returns The webhook URL to use
 */
export function resolveWebhookUrl(
	config: WebhookRoutingConfig | null | undefined,
	answers: Record<string, unknown>,
	defaultUrl: string
): { url: string; ruleName?: string } {
	if (!config?.rules || config.rules.length === 0) {
		return { url: defaultUrl };
	}

	// Sort rules by priority (lower = higher priority)
	const sortedRules = [...config.rules].sort(
		(a, b) => (a.priority ?? 100) - (b.priority ?? 100)
	);

	// Find first matching rule
	for (const rule of sortedRules) {
		if (evaluateCondition(rule.condition, answers)) {
			return { url: rule.webhookUrl, ruleName: rule.name };
		}
	}

	// No rules matched, use fallback or default
	return { url: config.fallbackUrl || defaultUrl };
}

/**
 * Validate webhook routing configuration.
 */
export function validateRoutingConfig(
	config: unknown
): { valid: boolean; error?: string } {
	if (!config || typeof config !== "object") {
		return { valid: true }; // Empty config is valid
	}

	const cfg = config as WebhookRoutingConfig;

	if (!Array.isArray(cfg.rules)) {
		return { valid: false, error: "rules must be an array" };
	}

	for (let i = 0; i < cfg.rules.length; i++) {
		const rule = cfg.rules[i];

		if (!rule.id || typeof rule.id !== "string") {
			return { valid: false, error: `Rule ${i}: missing or invalid id` };
		}

		if (!rule.webhookUrl || typeof rule.webhookUrl !== "string") {
			return { valid: false, error: `Rule ${i}: missing or invalid webhookUrl` };
		}

		if (!rule.condition || typeof rule.condition !== "object") {
			return { valid: false, error: `Rule ${i}: missing or invalid condition` };
		}

		const validOperators = ["equals", "not_equals", "contains", "greater_than", "less_than", "in"];
		if (!validOperators.includes(rule.condition.operator)) {
			return { valid: false, error: `Rule ${i}: invalid operator` };
		}
	}

	return { valid: true };
}

