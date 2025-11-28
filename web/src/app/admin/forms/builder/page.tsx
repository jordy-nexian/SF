"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { FormSchema, Field, Step } from "@/types/form-schema";
import FormRenderer from "@/components/FormRenderer";

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

export default function FormBuilderPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const formId = searchParams.get("formId");

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

	const selectedField = schema.fields.find((f) => f.key === selectedFieldKey);

	// Add a new field
	const addField = useCallback(
		(fieldType: string, index?: number) => {
			const label = FIELD_TYPES.find((t) => t.type === fieldType)?.label || "Field";
			const key = generateKey(
				label,
				schema.fields.map((f) => f.key)
			);

			const newField: Field = {
				key,
				type: fieldType as Field["type"],
				label,
				required: false,
			};

			// Add options for select/radio/checkbox fields
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

	// Update a field
	const updateField = useCallback((key: string, updates: Partial<Field>) => {
		setSchema((prev) => ({
			...prev,
			fields: prev.fields.map((f) => (f.key === key ? { ...f, ...updates } : f)),
		}));
	}, []);

	// Delete a field
	const deleteField = useCallback((key: string) => {
		setSchema((prev) => ({
			...prev,
			fields: prev.fields.filter((f) => f.key !== key),
		}));
		setSelectedFieldKey(null);
	}, []);

	// Move field up/down
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

	// Drag handlers
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

	// Save form
	const saveForm = async () => {
		if (!publicId) {
			setError("Please enter a public ID");
			return;
		}

		setSaving(true);
		setError(null);

		try {
			const endpoint = formId ? `/api/admin/forms/${formId}` : "/api/admin/forms";
			const method = formId ? "PUT" : "POST";

			const res = await fetch(endpoint, {
				method,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: formName,
					publicId,
					schema,
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Failed to save form");
			}

			const data = await res.json();
			router.push(`/admin/forms/${data.formId || data.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex h-[calc(100vh-80px)] gap-4">
			{/* Field Palette */}
			<div className="w-48 shrink-0 rounded-lg border bg-white p-4">
				<h3 className="mb-3 text-sm font-medium text-gray-700">Add Fields</h3>
				<div className="space-y-2">
					{FIELD_TYPES.map((field) => (
						<div
							key={field.type}
							draggable
							onDragStart={() => handleDragStart({ type: "new-field", fieldType: field.type })}
							onClick={() => addField(field.type)}
							className="flex cursor-move items-center gap-2 rounded border bg-gray-50 p-2 text-sm hover:bg-gray-100"
						>
							<span className="w-6 text-center text-gray-400">{field.icon}</span>
							<span>{field.label}</span>
						</div>
					))}
				</div>
			</div>

			{/* Canvas */}
			<div className="flex-1 overflow-auto rounded-lg border bg-white p-4">
				<div className="mb-4 grid gap-3 sm:grid-cols-2">
					<div>
						<label className="mb-1 block text-sm font-medium">Form Name</label>
						<input
							type="text"
							className="w-full rounded border px-3 py-2"
							value={formName}
							onChange={(e) => setFormName(e.target.value)}
						/>
					</div>
					<div>
						<label className="mb-1 block text-sm font-medium">Public ID (URL slug)</label>
						<input
							type="text"
							className="w-full rounded border px-3 py-2"
							value={publicId}
							onChange={(e) => setPublicId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
							placeholder="my-form"
						/>
					</div>
				</div>

				<div className="mb-4">
					<label className="mb-1 block text-sm font-medium">Form Title</label>
					<input
						type="text"
						className="w-full rounded border px-3 py-2"
						value={schema.title}
						onChange={(e) => setSchema((prev) => ({ ...prev, title: e.target.value }))}
					/>
				</div>

				<div className="mb-4">
					<label className="mb-1 block text-sm font-medium">Description</label>
					<textarea
						className="w-full rounded border px-3 py-2"
						rows={2}
						value={schema.description || ""}
						onChange={(e) => setSchema((prev) => ({ ...prev, description: e.target.value }))}
					/>
				</div>

				{/* Field List */}
				<div
					className="min-h-[200px] rounded border-2 border-dashed border-gray-200 p-4"
					onDragOver={handleDragOver}
					onDrop={(e) => handleDrop(e)}
				>
					{schema.fields.length === 0 ? (
						<div className="flex h-32 items-center justify-center text-gray-400">
							Drag fields here or click to add
						</div>
					) : (
						<div className="space-y-2">
							{schema.fields.map((field, index) => (
								<div
									key={field.key}
									onClick={() => setSelectedFieldKey(field.key)}
									className={`flex items-center justify-between rounded border p-3 cursor-pointer transition ${
										selectedFieldKey === field.key
											? "border-blue-500 bg-blue-50"
											: "hover:bg-gray-50"
									}`}
								>
									<div className="flex items-center gap-3">
										<span className="text-gray-400">
											{FIELD_TYPES.find((t) => t.type === field.type)?.icon || "?"}
										</span>
										<div>
											<div className="font-medium">{field.label}</div>
											<div className="text-xs text-gray-500">
												{field.type} • {field.key}
												{field.required && " • required"}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-1">
										<button
											onClick={(e) => {
												e.stopPropagation();
												moveField(field.key, "up");
											}}
											disabled={index === 0}
											className="rounded p-1 hover:bg-gray-200 disabled:opacity-30"
										>
											↑
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												moveField(field.key, "down");
											}}
											disabled={index === schema.fields.length - 1}
											className="rounded p-1 hover:bg-gray-200 disabled:opacity-30"
										>
											↓
										</button>
										<button
											onClick={(e) => {
												e.stopPropagation();
												deleteField(field.key);
											}}
											className="rounded p-1 text-red-500 hover:bg-red-50"
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
				<div className="mt-4 flex items-center gap-3">
					<button
						onClick={saveForm}
						disabled={saving}
						className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
					>
						{saving ? "Saving..." : "Save Form"}
					</button>
					<Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
						Cancel
					</Link>
					{error && <span className="text-sm text-red-600">{error}</span>}
				</div>
			</div>

			{/* Properties Panel */}
			<div className="w-72 shrink-0 rounded-lg border bg-white p-4">
				<h3 className="mb-3 text-sm font-medium text-gray-700">Field Properties</h3>
				{selectedField ? (
					<div className="space-y-3">
						<div>
							<label className="mb-1 block text-xs text-gray-600">Label</label>
							<input
								type="text"
								className="w-full rounded border px-2 py-1.5 text-sm"
								value={selectedField.label}
								onChange={(e) => updateField(selectedField.key, { label: e.target.value })}
							/>
						</div>

						<div>
							<label className="mb-1 block text-xs text-gray-600">Field Key</label>
							<input
								type="text"
								className="w-full rounded border px-2 py-1.5 font-mono text-sm"
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
							<label className="mb-1 block text-xs text-gray-600">Help Text</label>
							<input
								type="text"
								className="w-full rounded border px-2 py-1.5 text-sm"
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
							/>
							<label htmlFor="required" className="text-sm">Required</label>
						</div>

						{/* Options for select/radio/checkbox */}
						{["select", "radio", "checkboxGroup"].includes(selectedField.type) && (
							<div>
								<label className="mb-1 block text-xs text-gray-600">Options</label>
								<div className="space-y-1">
									{(selectedField.options || []).map((opt, i) => (
										<div key={i} className="flex gap-1">
											<input
												type="text"
												className="flex-1 rounded border px-2 py-1 text-sm"
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
												className="text-red-500 hover:text-red-700"
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
										className="text-sm text-blue-600 hover:underline"
									>
										+ Add option
									</button>
								</div>
							</div>
						)}

						{/* Validation */}
						<div className="border-t pt-3">
							<label className="mb-2 block text-xs font-medium text-gray-600">Validation</label>
							{["text", "textarea", "email"].includes(selectedField.type) && (
								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className="text-xs text-gray-500">Min Length</label>
										<input
											type="number"
											className="w-full rounded border px-2 py-1 text-sm"
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
										<label className="text-xs text-gray-500">Max Length</label>
										<input
											type="number"
											className="w-full rounded border px-2 py-1 text-sm"
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
										<label className="text-xs text-gray-500">Min Value</label>
										<input
											type="number"
											className="w-full rounded border px-2 py-1 text-sm"
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
										<label className="text-xs text-gray-500">Max Value</label>
										<input
											type="number"
											className="w-full rounded border px-2 py-1 text-sm"
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
					<p className="text-sm text-gray-500">Select a field to edit its properties</p>
				)}

				{/* Live Preview Toggle */}
				<div className="mt-6 border-t pt-4">
					<h4 className="mb-2 text-sm font-medium text-gray-700">Preview</h4>
					<div className="max-h-64 overflow-auto rounded border bg-gray-50 p-3">
						<FormRenderer schema={schema} mode="preview" />
					</div>
				</div>
			</div>
		</div>
	);
}

