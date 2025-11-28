export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  const features = [
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      ),
      gradient: "from-indigo-500 to-purple-600",
      title: "Schema-driven runtime",
      desc: "Render forms from JSON with multi-step wizards, conditional visibility, repeatable sections, and real-time validation. Define once, render anywhere."
    },
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      ),
      gradient: "from-green-500 to-emerald-500",
      title: "n8n relay with HMAC",
      desc: "Submissions are forwarded to your n8n router webhook, signed with a per-tenant HMAC secret. We never store answers—only metadata for analytics."
    },
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      ),
      gradient: "from-orange-500 to-red-500",
      title: "Embeds & runtime",
      desc: "Hosted URL, iframe, and JS embed options to drop forms anywhere. Responsive design with great UX on any device."
    },
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      ),
      gradient: "from-cyan-500 to-blue-500",
      title: "Custom theming",
      desc: "Tenant themes using CSS variables. Apply custom colors, fonts, and styling per form for brand-consistent experiences."
    },
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      ),
      gradient: "from-pink-500 to-rose-500",
      title: "Analytics & A/B testing",
      desc: "Track submissions, completion rates, and drop-off points. Run A/B tests on form variants to optimize conversion rates."
    },
    {
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      ),
      gradient: "from-violet-500 to-purple-600",
      title: "Security first",
      desc: "HMAC-signed webhooks, SSRF protection, rate limiting, IP allowlisting, and zero answer storage. Your data stays yours."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white pt-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] -top-32 -right-32" />
        <div className="absolute w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[120px] bottom-0 -left-32" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              collect data
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Powerful form infrastructure that respects privacy and integrates seamlessly with your automation stack.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature, i) => (
            <div 
              key={i}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-indigo-500/30 hover:bg-white/[0.07] transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {feature.icon}
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-3">{feature.title}</h2>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
