"use client";

import Link from "next/link";

const cards = [
    {
        title: "WIP Assignment",
        icon: "🔍",
        description:
            "Start from a WIP number — look up client data from Quickbase, pick a template, prefill fields, and assign to a customer.",
        href: "/admin/wizard/new",
        gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        shadow: "rgba(99, 102, 241, 0.25)",
    },
    {
        title: "Build Form",
        icon: "🛠️",
        description:
            "Create a new form from scratch using the drag-and-drop builder or upload HTML directly.",
        href: "/admin/forms/builder",
        gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
        shadow: "rgba(59, 130, 246, 0.25)",
    },
];

export default function NewFormChoicePage() {
    return (
        <div className="mx-auto max-w-2xl py-12">
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-white mb-2">
                    Create Something New
                </h1>
                <p className="text-sm" style={{ color: "#94a3b8" }}>
                    Choose how you&apos;d like to get started
                </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                {cards.map((card) => (
                    <Link
                        key={card.href}
                        href={card.href}
                        className="group relative rounded-2xl p-6 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
                        style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                    >
                        {/* Icon badge */}
                        <div
                            className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition-shadow duration-200"
                            style={{
                                background: card.gradient,
                                boxShadow: `0 8px 24px ${card.shadow}`,
                            }}
                        >
                            {card.icon}
                        </div>

                        <h2 className="mb-2 text-lg font-semibold text-white">
                            {card.title}
                        </h2>
                        <p
                            className="text-sm leading-relaxed"
                            style={{ color: "#94a3b8" }}
                        >
                            {card.description}
                        </p>

                        {/* Arrow indicator */}
                        <div
                            className="mt-4 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1"
                            style={{ color: "#818cf8" }}
                        >
                            Get started →
                        </div>

                        {/* Hover glow */}
                        <div
                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            style={{
                                background: card.gradient,
                                opacity: 0,
                                mixBlendMode: "overlay",
                            }}
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
}
