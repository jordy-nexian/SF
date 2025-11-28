export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white pt-24">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[500px] h-[500px] bg-indigo-600 -top-32 -right-32" />
        <div className="glow-orb w-[400px] h-[400px] bg-purple-600 bottom-0 -left-32" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">collect data</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Powerful form infrastructure that respects privacy and integrates seamlessly with your automation stack.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Feature 1 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Schema-driven runtime</h2>
            <p className="text-slate-400">
              Render forms from JSON with multi-step wizards, conditional visibility, repeatable sections, and real-time validation. Define once, render anywhere.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">n8n relay with HMAC</h2>
            <p className="text-slate-400">
              Submissions are forwarded to your n8n router webhook, signed with a per-tenant HMAC secret. We never store answers—only metadata for analytics.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Embeds & runtime</h2>
            <p className="text-slate-400">
              Hosted URL, iframe, and JS embed options to drop forms anywhere. Responsive design with great UX on any device.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Custom theming</h2>
            <p className="text-slate-400">
              Tenant themes using CSS variables. Apply custom colors, fonts, and styling per form for brand-consistent experiences.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Analytics & A/B testing</h2>
            <p className="text-slate-400">
              Track submissions, completion rates, and drop-off points. Run A/B tests on form variants to optimize conversion rates.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-3">Security first</h2>
            <p className="text-slate-400">
              HMAC-signed webhooks, SSRF protection, rate limiting, IP allowlisting, and zero answer storage. Your data stays yours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
