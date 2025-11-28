"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formTemplates, templateCategories } from "@/lib/form-templates";
import { useState } from "react";

export default function TemplatesPage() {
	const router = useRouter();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const filteredTemplates = selectedCategory
		? formTemplates.filter((t) => t.category === selectedCategory)
		: formTemplates;

	function selectTemplate(templateId: string) {
		router.push(`/admin/forms/new?template=${templateId}`);
	}

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Choose a Template</h1>
					<p className="mt-1 text-sm text-gray-600">
						Start with a pre-built template or{" "}
						<Link href="/admin/forms/new" className="text-blue-600 hover:underline">
							create from scratch
						</Link>
					</p>
				</div>
				<Link href="/admin/forms/new" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
					Blank Form
				</Link>
			</div>

			{/* Category filters */}
			<div className="mb-6 flex flex-wrap gap-2">
				<button
					onClick={() => setSelectedCategory(null)}
					className={`rounded-full px-4 py-1.5 text-sm transition ${
						selectedCategory === null
							? "bg-black text-white"
							: "bg-gray-100 text-gray-700 hover:bg-gray-200"
					}`}
				>
					All
				</button>
				{templateCategories.map((cat) => (
					<button
						key={cat.id}
						onClick={() => setSelectedCategory(cat.id)}
						className={`rounded-full px-4 py-1.5 text-sm transition ${
							selectedCategory === cat.id
								? "bg-black text-white"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
					>
						{cat.name}
					</button>
				))}
			</div>

			{/* Template grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{filteredTemplates.map((template) => (
					<button
						key={template.id}
						onClick={() => selectTemplate(template.id)}
						className="group rounded-lg border bg-white p-5 text-left transition hover:border-black hover:shadow-md"
					>
						<div className="mb-2 flex items-start justify-between">
							<h3 className="font-medium group-hover:text-black">{template.name}</h3>
							<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
								{template.category}
							</span>
						</div>
						<p className="text-sm text-gray-600">{template.description}</p>
						<div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
							<span>{template.schema.fields.length} fields</span>
							{template.schema.steps && template.schema.steps.length > 0 && (
								<>
									<span>•</span>
									<span>{template.schema.steps.length} steps</span>
								</>
							)}
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

