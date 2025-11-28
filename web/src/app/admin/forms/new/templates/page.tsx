"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formTemplates, templateCategories } from "@/lib/form-templates";
import { useState } from "react";

const cardStyle = {
	background: 'rgba(255, 255, 255, 0.05)',
	border: '1px solid rgba(255, 255, 255, 0.1)',
};

export default function TemplatesPage() {
	const router = useRouter();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

	const filteredTemplates = selectedCategory
		? formTemplates.filter((t) => t.category === selectedCategory)
		: formTemplates;

	function selectTemplate(templateId: string) {
		router.push(`/admin/forms/builder?template=${templateId}`);
	}

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">Choose a Template</h1>
					<p className="mt-1 text-sm" style={{ color: '#94a3b8' }}>
						Start with a pre-built template or{" "}
						<Link href="/admin/forms/builder" style={{ color: '#818cf8' }}>
							start from scratch
						</Link>
					</p>
				</div>
				<Link 
					href="/admin/forms/builder" 
					className="rounded-full px-4 py-2 text-sm font-medium transition-all"
					style={{ 
						background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
						color: 'white',
					}}
				>
					Blank Form
				</Link>
			</div>

			{/* Category filters */}
			<div className="mb-6 flex flex-wrap gap-2">
				<button
					onClick={() => setSelectedCategory(null)}
					className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
					style={selectedCategory === null ? {
						background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
						color: 'white',
					} : {
						background: 'rgba(255, 255, 255, 0.05)',
						color: '#94a3b8',
					}}
				>
					All
				</button>
				{templateCategories.map((cat) => (
					<button
						key={cat.id}
						onClick={() => setSelectedCategory(cat.id)}
						className="rounded-full px-4 py-1.5 text-sm font-medium transition-all"
						style={selectedCategory === cat.id ? {
							background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
							color: 'white',
						} : {
							background: 'rgba(255, 255, 255, 0.05)',
							color: '#94a3b8',
						}}
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
						className="group rounded-xl p-5 text-left transition-all hover:-translate-y-1"
						style={{
							...cardStyle,
						}}
					>
						<div className="mb-3 flex items-start justify-between">
							<h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
								{template.name}
							</h3>
							<span 
								className="rounded-full px-2 py-0.5 text-xs capitalize"
								style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}
							>
								{template.category}
							</span>
						</div>
						<p className="text-sm" style={{ color: '#94a3b8' }}>{template.description}</p>
						<div className="mt-4 flex items-center gap-3 text-xs" style={{ color: '#64748b' }}>
							<span className="flex items-center gap-1">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
								{template.schema.fields.length} fields
							</span>
							{template.schema.steps && template.schema.steps.length > 0 && (
								<span className="flex items-center gap-1">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
									</svg>
									{template.schema.steps.length} steps
								</span>
							)}
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
