"use client";

import { useState } from "react";
import { defaultTheme, type ThemeConfig, themeToCssVars } from "@/types/theme";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

const colorFields: { key: keyof ThemeConfig; label: string }[] = [
	{ key: "primaryColor", label: "Primary Color" },
	{ key: "backgroundColor", label: "Background" },
	{ key: "textColor", label: "Text Color" },
	{ key: "borderColor", label: "Border Color" },
	{ key: "errorColor", label: "Error Color" },
	{ key: "successColor", label: "Success Color" },
	{ key: "buttonBgColor", label: "Button Background" },
	{ key: "buttonTextColor", label: "Button Text" },
	{ key: "buttonHoverBgColor", label: "Button Hover" },
];

const textFields: { key: keyof ThemeConfig; label: string; placeholder: string }[] = [
	{ key: "fontFamily", label: "Font Family", placeholder: "system-ui, sans-serif" },
	{ key: "fontSize", label: "Base Font Size", placeholder: "1rem" },
	{ key: "headingFontSize", label: "Heading Size", placeholder: "1.5rem" },
	{ key: "borderRadius", label: "Border Radius", placeholder: "0.375rem" },
	{ key: "inputPadding", label: "Input Padding", placeholder: "0.5rem 0.75rem" },
	{ key: "fieldSpacing", label: "Field Spacing", placeholder: "1rem" },
];

const presetThemes: { name: string; theme: Partial<ThemeConfig> }[] = [
	{ name: "Default", theme: defaultTheme },
	{
		name: "Dark Mode",
		theme: {
			primaryColor: "#60a5fa",
			backgroundColor: "#1f2937",
			textColor: "#f3f4f6",
			borderColor: "#4b5563",
			errorColor: "#f87171",
			successColor: "#34d399",
			buttonBgColor: "#3b82f6",
			buttonTextColor: "#ffffff",
			buttonHoverBgColor: "#2563eb",
		},
	},
	{
		name: "Minimal",
		theme: {
			primaryColor: "#000000",
			backgroundColor: "#ffffff",
			textColor: "#000000",
			borderColor: "#e5e5e5",
			buttonBgColor: "#000000",
			buttonTextColor: "#ffffff",
			buttonHoverBgColor: "#333333",
			borderRadius: "0",
		},
	},
	{
		name: "Soft",
		theme: {
			primaryColor: "#8b5cf6",
			backgroundColor: "#faf5ff",
			textColor: "#581c87",
			borderColor: "#ddd6fe",
			errorColor: "#dc2626",
			successColor: "#16a34a",
			buttonBgColor: "#8b5cf6",
			buttonTextColor: "#ffffff",
			buttonHoverBgColor: "#7c3aed",
			borderRadius: "0.75rem",
		},
	},
	{
		name: "Corporate",
		theme: {
			primaryColor: "#0369a1",
			backgroundColor: "#f8fafc",
			textColor: "#1e293b",
			borderColor: "#cbd5e1",
			buttonBgColor: "#0369a1",
			buttonTextColor: "#ffffff",
			buttonHoverBgColor: "#075985",
			fontFamily: "Georgia, serif",
		},
	},
];

export default function ThemeEditorPage() {
	const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	function updateTheme(key: keyof ThemeConfig, value: string) {
		setTheme((prev) => ({ ...prev, [key]: value }));
		setSaved(false);
	}

	function applyPreset(preset: Partial<ThemeConfig>) {
		setTheme({ ...defaultTheme, ...preset });
		setSaved(false);
	}

	async function saveTheme() {
		setSaving(true);
		try {
			const res = await fetch("/api/admin/settings", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ theme }),
			});
			if (res.ok) {
				setSaved(true);
			}
		} finally {
			setSaving(false);
		}
	}

	const cssVars = themeToCssVars(theme);

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">Theme Editor</h1>
					<p className="text-sm" style={{ color: '#94a3b8' }}>Customize how your forms look</p>
				</div>
				<button
					onClick={saveTheme}
					disabled={saving}
					className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all"
					style={{
						background: saved ? '#10b981' : 'linear-gradient(to right, #6366f1, #8b5cf6)',
						boxShadow: saved ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
					}}
				>
					{saving ? "Saving..." : saved ? "Saved ✓" : "Save Theme"}
				</button>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Editor */}
				<div className="space-y-6">
					{/* Presets */}
					<div className="rounded-xl p-5" style={cardStyle}>
						<h2 className="mb-4 font-semibold text-white">Presets</h2>
						<div className="flex flex-wrap gap-2">
							{presetThemes.map((preset) => (
								<button
									key={preset.name}
									onClick={() => applyPreset(preset.theme)}
									className="rounded-full px-4 py-1.5 text-sm transition-all"
									style={{ border: '1px solid #334155', color: '#cbd5e1' }}
								>
									{preset.name}
								</button>
							))}
						</div>
					</div>

					{/* Colors */}
					<div className="rounded-xl p-5" style={cardStyle}>
						<h2 className="mb-4 font-semibold text-white">Colors</h2>
						<div className="grid gap-4 sm:grid-cols-2">
							{colorFields.map((field) => (
								<div key={field.key} className="flex items-center gap-3">
									<input
										type="color"
										value={theme[field.key]}
										onChange={(e) => updateTheme(field.key, e.target.value)}
										className="h-10 w-14 cursor-pointer rounded-lg border-0"
										style={{ background: '#1e293b' }}
									/>
									<div className="flex-1">
										<div className="text-sm" style={{ color: '#94a3b8' }}>{field.label}</div>
										<input
											type="text"
											value={theme[field.key]}
											onChange={(e) => updateTheme(field.key, e.target.value)}
											className="w-full rounded-lg px-2 py-1 font-mono text-xs focus:outline-none"
											style={inputStyle}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Typography & Spacing */}
					<div className="rounded-xl p-5" style={cardStyle}>
						<h2 className="mb-4 font-semibold text-white">Typography & Spacing</h2>
						<div className="grid gap-4 sm:grid-cols-2">
							{textFields.map((field) => (
								<div key={field.key}>
									<label className="mb-1.5 block text-sm" style={{ color: '#94a3b8' }}>{field.label}</label>
									<input
										type="text"
										value={theme[field.key]}
										onChange={(e) => updateTheme(field.key, e.target.value)}
										placeholder={field.placeholder}
										className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
										style={inputStyle}
									/>
								</div>
							))}
						</div>
					</div>

					{/* CSS Output */}
					<div className="rounded-xl p-5" style={cardStyle}>
						<h2 className="mb-4 font-semibold text-white">CSS Variables</h2>
						<pre 
							className="max-h-40 overflow-auto rounded-lg p-4 text-xs font-mono"
							style={{ background: 'rgba(255, 255, 255, 0.03)', color: '#10b981' }}
						>
							{Object.entries(cssVars).map(([k, v]) => `${k}: ${v};`).join("\n")}
						</pre>
					</div>
				</div>

				{/* Preview */}
				<div className="rounded-xl p-5" style={cardStyle}>
					<h2 className="mb-4 font-semibold text-white">Preview</h2>
					<div
						className="rounded-xl p-6"
						style={{
							...cssVars,
							backgroundColor: theme.backgroundColor,
							color: theme.textColor,
							fontFamily: theme.fontFamily,
							fontSize: theme.fontSize,
							border: `1px solid ${theme.borderColor}`,
						} as React.CSSProperties}
					>
						<h3 style={{ fontSize: theme.headingFontSize }} className="mb-2 font-semibold">
							Sample Form
						</h3>
						<p className="mb-4 text-sm opacity-80">
							This is how your forms will look with the current theme.
						</p>

						<div style={{ marginBottom: theme.fieldSpacing }}>
							<label className="mb-1 block text-sm font-medium">Email *</label>
							<input
								type="email"
								placeholder="you@example.com"
								className="w-full"
								style={{
									border: `1px solid ${theme.borderColor}`,
									borderRadius: theme.borderRadius,
									padding: theme.inputPadding,
									backgroundColor: "transparent",
								}}
							/>
						</div>

						<div style={{ marginBottom: theme.fieldSpacing }}>
							<label className="mb-1 block text-sm font-medium">Message</label>
							<textarea
								rows={3}
								placeholder="Your message..."
								className="w-full"
								style={{
									border: `1px solid ${theme.borderColor}`,
									borderRadius: theme.borderRadius,
									padding: theme.inputPadding,
									backgroundColor: "transparent",
								}}
							/>
						</div>

						<div style={{ marginBottom: theme.fieldSpacing }}>
							<label className="mb-1 block text-sm font-medium">Category</label>
							<select
								className="w-full"
								style={{
									border: `1px solid ${theme.borderColor}`,
									borderRadius: theme.borderRadius,
									padding: theme.inputPadding,
									backgroundColor: "transparent",
								}}
							>
								<option>Select...</option>
								<option>General</option>
								<option>Support</option>
							</select>
						</div>

						<div className="flex items-center gap-4">
							<button
								type="button"
								style={{
									backgroundColor: theme.buttonBgColor,
									color: theme.buttonTextColor,
									borderRadius: theme.borderRadius,
									padding: theme.inputPadding,
								}}
							>
								Submit
							</button>
							<span style={{ color: theme.errorColor }} className="text-sm">Error message</span>
							<span style={{ color: theme.successColor }} className="text-sm">Success!</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
