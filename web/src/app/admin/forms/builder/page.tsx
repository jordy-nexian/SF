"use client";

import { useState, useCallback, Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { FormSchema, Field } from "@/types/form-schema";
import FormRenderer from "@/components/FormRenderer";
import { getTemplateById } from "@/lib/form-templates";
import { defaultTheme, themeToCssVars, type ThemeConfig } from "@/types/theme";
import dynamic from "next/dynamic";

const HtmlTemplateEditor = dynamic(() => import("@/components/HtmlTemplateEditor"), {
	ssr: false,
	loading: () => <div className="text-white p-4">Loading editor...</div>,
});

const FIELD_TYPES = [
	{ type: "text", label: "Text Input", icon: "Aa" },
	{ type: "email", label: "Email", icon: "@" },
	{ type: "number", label: "Number", icon: "#" },
	{ type: "textarea", label: "Text Area", icon: "¶" },
	{ type: "select", label: "Dropdown", icon: "▼" },
	{ type: "radio", label: "Radio Buttons", icon: "◉" },
	{ type: "checkboxGroup", label: "Checkboxes", icon: "☑" },
	{ type: "boolean", label: "Checkbox", icon: "✓" },
	{ type: "date", label: "Date Picker", icon: "📅" },
] as const;

type DragItem = {
	type: "new-field" | "existing-field";
	fieldType?: string;
	fieldKey?: string;
};

function generateKey(label: string, existingKeys: string[]): string {
	const base = label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_|_$/g, "");
	let key = base || "field";
	let counter = 1;
	while (existingKeys.includes(key)) {
		key = `${base}_${counter}`;
		counter++;
	}
	return key;
}

// Shared styles
const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

const inputStyle = {
	background: '#1e293b',
	border: '1px solid #334155',
	color: 'white',
};

function FormBuilderContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formId = searchParams.get("formId");
	const templateId = searchParams.get("template");

	const [formName, setFormName] = useState("New Form");
	const [publicId, setPublicId] = useState("");
	const [schema, setSchema] = useState<FormSchema>({
		id: "new-form",
		version: 1,
		title: "Untitled Form",
		description: "",
		fields: [],
		steps: [],
	});
	const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
	const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [templateName, setTemplateName] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);
	const [activePanel, setActivePanel] = useState<"fields" | "design" | "template">("fields");
	const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
	const [htmlContent, setHtmlContent] = useState("");
	const [tokens, setTokens] = useState<any[]>([]);
	// Token mappings for HTML templates
	const [linkedTemplateId, setLinkedTemplateId] = useState<string | null>(null);
	const [tokenMappings, setTokenMappings] = useState<Array<{
		tokenId: string;
		label: string;
		payloadKey: string;
		mode: "prefill" | "manual" | "signature";
	}>>([]);
	const [savingMappings, setSavingMappings] = useState(false);

	// Fetch tenant theme
	useEffect(() => {
		fetch("/api/admin/settings")
			.then((r) => r.ok ? r.json() : null)
			.then((json) => {
				const data = json?.data ?? json;
				if (data?.theme) {
					setTheme({ ...defaultTheme, ...data.theme });
				}
			})
			.catch(() => { });
	}, []);

	// Convert theme to CSS variables for preview
	const themeCssVars = useMemo(() => themeToCssVars(theme), [theme]);

	// Load template if specified
	useEffect(() => {
		if (templateId) {
			const template = getTemplateById(templateId);
			if (template) {
				setFormName(template.name);
				// Generate unique publicId with timestamp to avoid conflicts
				const uniqueSuffix = Date.now().toString(36).slice(-4);
				setPublicId(`${template.id}-${uniqueSuffix}`);
				setSchema(template.schema);
				setTemplateName(template.name);
			}
		}
	}, [templateId]);

	// Load existing form if formId is provided (edit mode)
	useEffect(() => {
		if (!formId) return;

		fetch(`/api/admin/forms/${formId}`)
			.then((r) => r.ok ? r.json() : Promise.reject(new Error("Form not found")))
			.then((json) => {
				const data = json.data ?? json;
				setFormName(data.name || "");
				setPublicId(data.publicId || "");
				if (data.currentVersion?.schema) {
					setSchema(data.currentVersion.schema);
				} else if (data.schema) {
					setSchema(data.schema);
				}
				if (data.currentVersion?.htmlContent) {
					setHtmlContent(data.currentVersion.htmlContent);
					setActivePanel("template"); // Switch to template view if HTML exists
				}
				// Store templateId for fetching mappings
				if (data.templateId) {
					setLinkedTemplateId(data.templateId);
				}
			})
			.catch((err) => {
				console.error("Failed to load form:", err);
				setError("Failed to load form for editing");
			});
	}, [formId]);

	// Fetch token mappings when we have a linked template
	useEffect(() => {
		if (!linkedTemplateId) {
			// Fallback: Extract tokens directly from HTML content if no template linked
			if (htmlContent) {
				const tokenRegex = /\[([^\]]+)\]/g;
				const foundTokens: Array<{ tokenId: string; label: string; payloadKey: string; mode: "prefill" | "manual" | "signature" }> = [];
				const seen = new Set<string>();
				let match;
				while ((match = tokenRegex.exec(htmlContent)) !== null) {
					const label = match[1];
					const tokenId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
					if (!seen.has(tokenId)) {
						seen.add(tokenId);
						foundTokens.push({
							tokenId,
							label,
							payloadKey: tokenId,
							mode: 'prefill',
						});
					}
				}
				setTokenMappings(foundTokens);
			}
			return;
		}

		fetch(`/api/admin/templates/${linkedTemplateId}/mappings`)
			.then((r) => r.ok ? r.json() : Promise.reject(new Error("Failed to load mappings")))
			.then((json) => {
				const data = json.data ?? json;
				if (data.tokens) {
					setTokenMappings(data.tokens.map((t: any) => ({
						tokenId: t.tokenId,
						label: t.label,
						payloadKey: t.payloadKey || '',
						mode: t.mode || 'prefill',
					})));
				}
			})
			.catch((err) => {
				console.error("Failed to load token mappings:", err);
			});
	}, [linkedTemplateId, htmlContent]);

	const selectedField = schema.fields.find((f) => f.key === selectedFieldKey);

	// Token mode helpers
	const cycleTokenMode = (tokenId: string) => {
		setTokenMappings(prev => prev.map(m => {
			if (m.tokenId !== tokenId) return m;
			const nextMode = m.mode === "prefill" ? "manual" : m.mode === "manual" ? "signature" : "prefill";
			return { ...m, mode: nextMode };
		}));
	};

	const getModeDisplay = (mode: "prefill" | "manual" | "signature") => {
		switch (mode) {
			case "prefill": return { icon: "🔄", label: "Prefill", bg: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", border: "rgba(99, 102, 241, 0.3)" };
			case "manual": return { icon: "✏️", label: "Manual", bg: "rgba(34, 197, 94, 0.2)", color: "#4ade80", border: "rgba(34, 197, 94, 0.3)" };
			case "signature": return { icon: "✍️", label: "Signature", bg: "rgba(251, 146, 60, 0.2)", color: "#fb923c", border: "rgba(251, 146, 60, 0.3)" };
		}
	};

	const saveMappings = async () => {
		if (!linkedTemplateId) return;
		setSavingMappings(true);
		try {
			const res = await fetch(`/api/admin/templates/${linkedTemplateId}/mappings`, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					mappings: tokenMappings.map(m => ({
						tokenId: m.tokenId,
						payloadKey: m.payloadKey,
						mode: m.mode,
					})),
				}),
			});
			if (!res.ok) throw new Error("Failed to save mappings");
			setSuccess("Mappings saved!");
			setTimeout(() => setSuccess(null), 2000);
		} catch (err) {
			console.error("Failed to save mappings:", err);
			setError("Failed to save token mappings");
		} finally {
			setSavingMappings(false);
		}
	};

	const addField = useCallback(
		(fieldType: string, index?: number) => {
			const label = FIELD_TYPES.find((t) => t.type === fieldType)?.label || "Field";
			const key = generateKey(label, schema.fields.map((f) => f.key));

			const newField: Field = {
				key,
				type: fieldType as Field["type"],
				label,
				required: false,
			};

			if (["select", "radio", "checkboxGroup"].includes(fieldType)) {
				newField.options = [
					{ value: "option1", label: "Option 1" },
					{ value: "option2", label: "Option 2" },
				];
			}

			setSchema((prev) => {
				const fields = [...prev.fields];
				if (index !== undefined) {
					fields.splice(index, 0, newField);
				} else {
					fields.push(newField);
				}
				return { ...prev, fields };
			});

			setSelectedFieldKey(key);
		},
		[schema.fields]
	);

	const updateField = useCallback((key: string, updates: Partial<Field>) => {
		setSchema((prev) => ({
			...prev,
			fields: prev.fields.map((f) => (f.key === key ? { ...f, ...updates } : f)),
		}));
	}, []);

	const deleteField = useCallback((key: string) => {
		setSchema((prev) => ({
			...prev,
			fields: prev.fields.filter((f) => f.key !== key),
		}));
		setSelectedFieldKey(null);
	}, []);

	const moveField = useCallback((key: string, direction: "up" | "down") => {
		setSchema((prev) => {
			const fields = [...prev.fields];
			const index = fields.findIndex((f) => f.key === key);
			if (index === -1) return prev;

			const newIndex = direction === "up" ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= fields.length) return prev;

			[fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
			return { ...prev, fields };
		});
	}, []);

	const handleDragStart = (item: DragItem) => {
		setDraggedItem(item);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDrop = (e: React.DragEvent, index?: number) => {
		e.preventDefault();
		if (draggedItem?.type === "new-field" && draggedItem.fieldType) {
			addField(draggedItem.fieldType, index);
		}
		setDraggedItem(null);
	};

	const saveForm = async () => {
		if (!publicId) {
			setError("Please enter a public ID");
			return;
		}

		if (!formName.trim()) {
			setError("Please enter a form name");
			return;
		}

		setSaving(true);
		setError(null);
		setSuccess(null);

		try {
			const endpoint = formId ? `/api/admin/forms/${formId}` : "/api/admin/forms";
			const method = formId ? "PUT" : "POST";

			console.log("Saving form:", { endpoint, method, formName, publicId, fieldsCount: schema.fields.length });

			const res = await fetch(endpoint, {
				method,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ name: formName, publicId, schema, htmlContent }),
			});

			const json = await res.json().catch(() => ({}));
			console.log("Save response:", res.status, json);

			if (!res.ok) {
				// Handle standardized error response
				const errorMsg = json.error?.message || json.error || `Failed to save form (${res.status})`;
				throw new Error(errorMsg);
			}

			// Handle standardized success response: { success: true, data: { formId: "..." } }
			const responseData = json.data ?? json;
			const savedFormId = responseData.formId || responseData.id;

			setSuccess("Form saved! Redirecting...");
			// Short delay to show success message
			setTimeout(() => {
				router.push(`/admin/forms/${savedFormId}`);
			}, 500);
		} catch (err) {
			console.error("Save error:", err);
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex h-[calc(100vh-80px)] gap-4">
			{/* Left Panel - Fields / Design */}
			<div className="w-52 shrink-0 rounded-xl" style={cardStyle}>
				{/* Tab Switcher */}
				<div className="flex border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
					<button
						onClick={() => setActivePanel("fields")}
						className="flex-1 px-3 py-2.5 text-xs font-medium transition-all"
						style={{
							color: activePanel === "fields" ? '#818cf8' : '#64748b',
							borderBottom: activePanel === "fields" ? '2px solid #818cf8' : '2px solid transparent',
						}}
					>
						Fields
					</button>
					<button
						onClick={() => setActivePanel("design")}
						className="flex-1 px-3 py-2.5 text-xs font-medium transition-all"
						style={{
							color: activePanel === "design" ? '#818cf8' : '#64748b',
							borderBottom: activePanel === "design" ? '2px solid #818cf8' : '2px solid transparent',
						}}
					>
						Design
					</button>
					<button
						onClick={() => setActivePanel("template")}
						className="flex-1 px-3 py-2.5 text-xs font-medium transition-all"
						style={{
							color: activePanel === "template" ? '#818cf8' : '#64748b',
							borderBottom: activePanel === "template" ? '2px solid #818cf8' : '2px solid transparent',
						}}
					>
						HTML
					</button>
				</div>

				<div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
					{activePanel === "template" ? (
						<div className="space-y-4">
							<h3 className="text-xs font-medium" style={{ color: '#64748b' }}>Token Mappings</h3>

							{tokenMappings.length > 0 ? (
								<div className="space-y-2">
									{tokenMappings.map((mapping) => {
										const display = getModeDisplay(mapping.mode);
										return (
											<div
												key={mapping.tokenId}
												className="p-2 rounded-lg"
												style={{ background: 'rgba(255, 255, 255, 0.03)' }}
											>
												<div className="text-xs text-white mb-1.5 truncate" title={mapping.label}>
													{mapping.label}
												</div>
												<button
													type="button"
													onClick={() => cycleTokenMode(mapping.tokenId)}
													className="w-full px-2 py-1.5 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5"
													style={{
														background: display.bg,
														color: display.color,
														border: `1px solid ${display.border}`,
													}}
													title="Click to cycle: Prefill → Manual → Signature"
												>
													{display.icon} {display.label}
												</button>
											</div>
										);
									})}

									{linkedTemplateId ? (
										<button
											onClick={saveMappings}
											disabled={savingMappings}
											className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50 transition-all"
											style={{
												background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
											}}
										>
											{savingMappings ? "Saving..." : "Save Mappings"}
										</button>
									) : (
										<p className="mt-3 text-xs text-center" style={{ color: '#64748b' }}>
											Tokens extracted from HTML (read-only)
										</p>
									)}
								</div>
							) : (
								<div className="text-center space-y-4 pt-6">
									<div className="text-4xl opacity-50">{"</>"}</div>
									<div className="text-sm" style={{ color: '#94a3b8' }}>
										<p className="mb-2">HTML Editing Mode</p>
										<p className="text-xs opacity-75">
											No token mappings found.
										</p>
									</div>
								</div>
							)}

							<button
								onClick={() => setActivePanel("fields")}
								className="text-xs underline hover:no-underline mt-4 block"
								style={{ color: '#818cf8' }}
							>
								← Back to visual builder
							</button>
						</div>
					) : activePanel === "fields" ? (
						<>
							<h3 className="mb-3 text-xs font-medium" style={{ color: '#64748b' }}>Drag or click to add</h3>
							<div className="space-y-2">
								{FIELD_TYPES.map((field) => (
									<div
										key={field.type}
										draggable
										onDragStart={() => handleDragStart({ type: "new-field", fieldType: field.type })}
										onClick={() => addField(field.type)}
										className="flex cursor-move items-center gap-3 rounded-lg p-2.5 text-sm transition-all hover:bg-white/5"
										style={{
											background: 'rgba(255, 255, 255, 0.03)',
											border: '1px solid transparent',
											color: '#cbd5e1',
										}}
									>
										<span className="w-6 text-center" style={{ color: '#64748b' }}>{field.icon}</span>
										<span>{field.label}</span>
									</div>
								))}
							</div>
						</>
					) : (
						<div className="space-y-5">
							{/* Layout */}
							<div>
								<h3 className="mb-2 text-xs font-medium" style={{ color: '#64748b' }}>Layout</h3>
								<div className="space-y-1.5">
									{[
										{ value: "single", label: "Single Column", icon: "▭" },
										{ value: "two-column", label: "Two Columns", icon: "▭▭" },
										{ value: "card", label: "Card Style", icon: "▢" },
									].map((opt) => (
										<button
											key={opt.value}
											onClick={() => setSchema((prev) => ({ ...prev, layout: opt.value as any }))}
											className="flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-all"
											style={{
												background: schema.layout === opt.value ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
												border: schema.layout === opt.value ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
												color: schema.layout === opt.value ? '#a5b4fc' : '#94a3b8',
											}}
										>
											<span className="font-mono text-xs">{opt.icon}</span>
											<span>{opt.label}</span>
										</button>
									))}
								</div>
							</div>

							{/* Field Style */}
							<div>
								<h3 className="mb-2 text-xs font-medium" style={{ color: '#64748b' }}>Field Style</h3>
								<div className="space-y-1.5">
									{[
										{ value: "outline", label: "Outline" },
										{ value: "filled", label: "Filled" },
										{ value: "underline", label: "Underline" },
									].map((opt) => (
										<button
											key={opt.value}
											onClick={() => setSchema((prev) => ({ ...prev, fieldStyle: opt.value as any }))}
											className="flex w-full items-center gap-2 rounded-lg p-2 text-sm transition-all"
											style={{
												background: (schema.fieldStyle || "outline") === opt.value ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
												border: (schema.fieldStyle || "outline") === opt.value ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
												color: (schema.fieldStyle || "outline") === opt.value ? '#a5b4fc' : '#94a3b8',
											}}
										>
											<span>{opt.label}</span>
										</button>
									))}
								</div>
							</div>

							{/* Theme Link */}
							<div className="pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
								<p className="mb-2 text-xs" style={{ color: '#64748b' }}>
									Colors & typography are set in your account theme.
								</p>
								<a
									href="/admin/themes"
									className="flex items-center gap-2 rounded-lg p-2 text-sm transition-all hover:bg-white/5"
									style={{ color: '#818cf8' }}
								>
									<span>🎨</span>
									<span>Edit Theme</span>
								</a>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Canvas / Main Editor Area */}
			{activePanel === "template" ? (
				// HTML Editor takes full center space
				<div className="flex-1 rounded-xl overflow-hidden flex flex-col" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
					<div className="bg-[#1e1e1e] border-b border-[#333] px-4 py-2 text-xs text-gray-400 flex justify-between items-center shrink-0">
						<span>{formName || 'Untitled'}.html</span>
						<span>{htmlContent.length.toLocaleString()} chars</span>
					</div>
					<div className="flex-1 min-h-0">
						<HtmlTemplateEditor
							htmlContent={htmlContent}
							onHtmlChange={setHtmlContent}
							tokens={tokens}
							onTokensChange={setTokens}
						/>
					</div>
				</div>
			) : (
				// Visual Builder Canvas
				<div className="flex-1 overflow-auto rounded-xl p-5" style={cardStyle}>
					<div className="mb-5 grid gap-4 sm:grid-cols-2">
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Form Name</label>
							<input
								type="text"
								className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
								style={inputStyle}
								value={formName}
								onChange={(e) => setFormName(e.target.value)}
							/>
						</div>
						<div>
							<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Public ID (URL slug)</label>
							<input
								type="text"
								className="w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none"
								style={inputStyle}
								value={publicId}
								onChange={(e) => setPublicId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
								placeholder="my-form"
							/>
						</div>
					</div>

					<div className="mb-4">
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Form Title</label>
						<input
							type="text"
							className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
							style={inputStyle}
							value={schema.title}
							onChange={(e) => setSchema((prev) => ({ ...prev, title: e.target.value }))}
						/>
					</div>

					<div className="mb-5">
						<label className="mb-1.5 block text-sm font-medium" style={{ color: '#94a3b8' }}>Description</label>
						<textarea
							className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none"
							style={inputStyle}
							rows={2}
							value={schema.description || ""}
							onChange={(e) => setSchema((prev) => ({ ...prev, description: e.target.value }))}
						/>
					</div>

					{/* Field List */}
					<div
						className="min-h-[200px] rounded-xl p-4"
						style={{ border: '2px dashed #334155' }}
						onDragOver={handleDragOver}
						onDrop={(e) => handleDrop(e)}
					>
						{schema.fields.length === 0 ? (
							<div className="flex h-32 items-center justify-center" style={{ color: '#64748b' }}>
								Drag fields here or click to add
							</div>
						) : (
							<div className="space-y-2">
								{schema.fields.map((field, index) => (
									<div
										key={field.key}
										onClick={() => setSelectedFieldKey(field.key)}
										className="flex items-center justify-between rounded-lg p-3 cursor-pointer transition-all"
										style={{
											background: selectedFieldKey === field.key ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.03)',
											border: selectedFieldKey === field.key ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid transparent',
										}}
									>
										<div className="flex items-center gap-3">
											<span style={{ color: '#64748b' }}>
												{FIELD_TYPES.find((t) => t.type === field.type)?.icon || "?"}
											</span>
											<div>
												<div className="font-medium text-white">{field.label}</div>
												<div className="text-xs" style={{ color: '#64748b' }}>
													{field.type} • {field.key}
													{field.required && " • required"}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-1">
											<button
												onClick={(e) => { e.stopPropagation(); moveField(field.key, "up"); }}
												disabled={index === 0}
												className="rounded p-1.5 transition-all disabled:opacity-30 active:scale-90 active:bg-white/5"
												style={{ color: '#94a3b8' }}
											>
												↑
											</button>
											<button
												onClick={(e) => { e.stopPropagation(); moveField(field.key, "down"); }}
												disabled={index === schema.fields.length - 1}
												className="rounded p-1.5 transition-all disabled:opacity-30 active:scale-90 active:bg-white/5"
												style={{ color: '#94a3b8' }}
											>
												↓
											</button>
											<button
												onClick={(e) => { e.stopPropagation(); deleteField(field.key); }}
												className="rounded p-1.5 transition-all active:scale-90 active:bg-red-500/10"
												style={{ color: '#f87171' }}
											>
												×
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="mt-5 flex items-center gap-4">
						<button
							onClick={saveForm}
							disabled={saving}
							className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-all active:scale-[0.98] active:shadow-[0_2px_8px_rgba(99,102,241,0.2)]"
							style={{
								background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
								boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
							}}
						>
							{saving ? "Saving..." : "Save Form"}
						</button>
						<button
							onClick={() => setShowPreview(true)}
							className="rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] active:bg-[rgba(255,255,255,0.05)]"
							style={{ border: '1px solid #334155', color: '#cbd5e1' }}
						>
							👁 Preview
						</button>
						<Link href="/admin" className="text-sm transition-colors" style={{ color: '#94a3b8' }}>
							Cancel
						</Link>
						{error && <span className="text-sm" style={{ color: '#f87171' }}>{error}</span>}
						{success && <span className="text-sm" style={{ color: '#10b981' }}>{success}</span>}
					</div>
				</div>
			)}

			{/* Properties Panel - Hidden in HTML mode */}
			{activePanel !== "template" && (
				<div className="w-72 shrink-0 rounded-xl p-4" style={cardStyle}>
					<h3 className="mb-4 text-sm font-medium" style={{ color: '#94a3b8' }}>Field Properties</h3>
					{selectedField ? (
						<div className="space-y-4">
							<div>
								<label className="mb-1.5 block text-xs" style={{ color: '#64748b' }}>Label</label>
								<input
									type="text"
									className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
									style={inputStyle}
									value={selectedField.label}
									onChange={(e) => updateField(selectedField.key, { label: e.target.value })}
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-xs" style={{ color: '#64748b' }}>Field Key</label>
								<input
									type="text"
									className="w-full rounded-lg px-3 py-2 font-mono text-sm focus:outline-none"
									style={inputStyle}
									value={selectedField.key}
									onChange={(e) => {
										const newKey = e.target.value.replace(/[^a-z0-9_]/gi, "");
										if (newKey && !schema.fields.some((f) => f.key === newKey && f.key !== selectedField.key)) {
											setSchema((prev) => ({
												...prev,
												fields: prev.fields.map((f) =>
													f.key === selectedField.key ? { ...f, key: newKey } : f
												),
											}));
											setSelectedFieldKey(newKey);
										}
									}}
								/>
							</div>

							<div>
								<label className="mb-1.5 block text-xs" style={{ color: '#64748b' }}>Help Text</label>
								<input
									type="text"
									className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
									style={inputStyle}
									value={selectedField.helpText || ""}
									onChange={(e) => updateField(selectedField.key, { helpText: e.target.value || undefined })}
									placeholder="Optional help text"
								/>
							</div>

							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="required"
									checked={selectedField.required || false}
									onChange={(e) => updateField(selectedField.key, { required: e.target.checked })}
									className="rounded"
								/>
								<label htmlFor="required" className="text-sm" style={{ color: '#cbd5e1' }}>Required</label>
							</div>

							{/* Options for select/radio/checkbox */}
							{["select", "radio", "checkboxGroup"].includes(selectedField.type) && (
								<div>
									<label className="mb-1.5 block text-xs" style={{ color: '#64748b' }}>Options</label>
									<div className="space-y-2">
										{(selectedField.options || []).map((opt, i) => (
											<div key={i} className="flex gap-2">
												<input
													type="text"
													className="flex-1 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
													style={inputStyle}
													value={opt.label}
													onChange={(e) => {
														const newOptions = [...(selectedField.options || [])];
														newOptions[i] = {
															...newOptions[i],
															label: e.target.value,
															value: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"),
														};
														updateField(selectedField.key, { options: newOptions });
													}}
												/>
												<button
													onClick={() => {
														const newOptions = (selectedField.options || []).filter((_, idx) => idx !== i);
														updateField(selectedField.key, { options: newOptions });
													}}
													style={{ color: '#f87171' }}
												>
													×
												</button>
											</div>
										))}
										<button
											onClick={() => {
												const newOptions = [
													...(selectedField.options || []),
													{ value: `option_${Date.now()}`, label: "New Option" },
												];
												updateField(selectedField.key, { options: newOptions });
											}}
											className="text-sm transition-colors"
											style={{ color: '#818cf8' }}
										>
											+ Add option
										</button>
									</div>
								</div>
							)}

							{/* Validation */}
							<div className="pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
								<label className="mb-2 block text-xs font-medium" style={{ color: '#64748b' }}>Validation</label>
								{["text", "textarea", "email"].includes(selectedField.type) && (
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-xs" style={{ color: '#64748b' }}>Min Length</label>
											<input
												type="number"
												className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
												style={inputStyle}
												value={selectedField.validation?.minLength || ""}
												onChange={(e) =>
													updateField(selectedField.key, {
														validation: {
															...selectedField.validation,
															minLength: e.target.value ? parseInt(e.target.value) : undefined,
														},
													})
												}
											/>
										</div>
										<div>
											<label className="text-xs" style={{ color: '#64748b' }}>Max Length</label>
											<input
												type="number"
												className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
												style={inputStyle}
												value={selectedField.validation?.maxLength || ""}
												onChange={(e) =>
													updateField(selectedField.key, {
														validation: {
															...selectedField.validation,
															maxLength: e.target.value ? parseInt(e.target.value) : undefined,
														},
													})
												}
											/>
										</div>
									</div>
								)}
								{selectedField.type === "number" && (
									<div className="grid grid-cols-2 gap-2">
										<div>
											<label className="text-xs" style={{ color: '#64748b' }}>Min Value</label>
											<input
												type="number"
												className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
												style={inputStyle}
												value={selectedField.validation?.min ?? ""}
												onChange={(e) =>
													updateField(selectedField.key, {
														validation: {
															...selectedField.validation,
															min: e.target.value ? parseFloat(e.target.value) : undefined,
														},
													})
												}
											/>
										</div>
										<div>
											<label className="text-xs" style={{ color: '#64748b' }}>Max Value</label>
											<input
												type="number"
												className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
												style={inputStyle}
												value={selectedField.validation?.max ?? ""}
												onChange={(e) =>
													updateField(selectedField.key, {
														validation: {
															...selectedField.validation,
															max: e.target.value ? parseFloat(e.target.value) : undefined,
														},
													})
												}
											/>
										</div>
									</div>
								)}
							</div>
						</div>
					) : (
						<p className="text-sm" style={{ color: '#64748b' }}>Select a field to edit its properties</p>
					)}
				</div>)}

			{/* Preview Modal */}
			{showPreview && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4"
					style={{ background: 'rgba(0, 0, 0, 0.8)' }}
					onClick={() => setShowPreview(false)}
				>
					<div
						className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
						style={{
							background: theme.backgroundColor,
							...themeCssVars,
						} as React.CSSProperties}
						onClick={(e) => e.stopPropagation()}
					>
						{/* Modal Header */}
						<div
							className="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
							style={{
								background: theme.backgroundColor,
								borderBottom: `1px solid ${theme.borderColor}`,
								color: theme.textColor,
							}}
						>
							<div>
								<h2 className="text-lg font-semibold" style={{ color: theme.textColor }}>Form Preview</h2>
								<p className="text-sm" style={{ color: theme.textColor, opacity: 0.7 }}>
									This is how your form will appear to users
								</p>
							</div>
							<button
								onClick={() => setShowPreview(false)}
								className="rounded-full p-2 transition-colors"
								style={{ color: theme.textColor, opacity: 0.6 }}
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>

						{/* Form Preview Content - Theme CSS vars applied */}
						<div className="p-6" style={{ fontFamily: theme.fontFamily }}>
							<FormRenderer schema={schema} mode="preview" />
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default function FormBuilderPage() {
	return (
		<Suspense fallback={
			<div className="flex items-center justify-center h-64" style={{ color: '#94a3b8' }}>
				Loading form builder...
			</div>
		}>
			<FormBuilderContent />
		</Suspense>
	);
}
