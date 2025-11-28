/**
 * Theme configuration for form styling.
 */

export type ThemeConfig = {
	// Colors
	primaryColor: string;
	backgroundColor: string;
	textColor: string;
	borderColor: string;
	errorColor: string;
	successColor: string;

	// Typography
	fontFamily: string;
	fontSize: string;
	headingFontSize: string;

	// Spacing
	borderRadius: string;
	inputPadding: string;
	fieldSpacing: string;

	// Button styles
	buttonBgColor: string;
	buttonTextColor: string;
	buttonHoverBgColor: string;
};

export const defaultTheme: ThemeConfig = {
	primaryColor: "#000000",
	backgroundColor: "#ffffff",
	textColor: "#1f2937",
	borderColor: "#d1d5db",
	errorColor: "#dc2626",
	successColor: "#16a34a",

	fontFamily: "system-ui, -apple-system, sans-serif",
	fontSize: "1rem",
	headingFontSize: "1.5rem",

	borderRadius: "0.375rem",
	inputPadding: "0.5rem 0.75rem",
	fieldSpacing: "1rem",

	buttonBgColor: "#000000",
	buttonTextColor: "#ffffff",
	buttonHoverBgColor: "#374151",
};

/**
 * Convert theme config to CSS custom properties.
 */
export function themeToCssVars(theme: Partial<ThemeConfig>): Record<string, string> {
	const merged = { ...defaultTheme, ...theme };
	return {
		"--form-primary": merged.primaryColor,
		"--form-bg": merged.backgroundColor,
		"--form-text": merged.textColor,
		"--form-border": merged.borderColor,
		"--form-error": merged.errorColor,
		"--form-success": merged.successColor,
		"--form-font": merged.fontFamily,
		"--form-font-size": merged.fontSize,
		"--form-heading-size": merged.headingFontSize,
		"--form-radius": merged.borderRadius,
		"--form-input-padding": merged.inputPadding,
		"--form-field-spacing": merged.fieldSpacing,
		"--form-btn-bg": merged.buttonBgColor,
		"--form-btn-text": merged.buttonTextColor,
		"--form-btn-hover": merged.buttonHoverBgColor,
	};
}

/**
 * Generate inline style string from theme.
 */
export function themeToStyleString(theme: Partial<ThemeConfig>): string {
	const vars = themeToCssVars(theme);
	return Object.entries(vars)
		.map(([key, value]) => `${key}: ${value}`)
		.join("; ");
}

