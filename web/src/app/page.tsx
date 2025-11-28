import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="glow-orb w-[600px] h-[600px] bg-indigo-600 -top-48 -left-48" />
        <div className="glow-orb w-[500px] h-[500px] bg-purple-600 top-1/3 -right-32" />
        <div className="glow-orb w-[400px] h-[400px] bg-orange-500 bottom-0 left-1/4" />
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="glass-card px-4 py-2 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-slate-300">Now with n8n native integration</span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6 animate-fade-in-up delay-100">
            Forms that flow,{" "}
            <span className="gradient-text">data that goes</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 text-center max-w-3xl mx-auto mb-10 animate-fade-in-up delay-200">
            Build stunning, dynamic forms without storing a single answer. 
            Submissions relay instantly to your n8n workflows—signed, secure, and seamless.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
            <Link href="/admin/forms/builder" className="btn-primary text-lg px-8 py-4">
              Start building free
            </Link>
            <Link href="/features" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch demo
            </Link>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6 animate-fade-in-up delay-400">
            No credit card required • Answers never stored • GDPR compliant
          </p>

          {/* Hero visual */}
          <div className="mt-16 relative animate-scale-in delay-500">
            <div className="gradient-border p-1">
              <div className="bg-slate-900 rounded-2xl p-6 md:p-8">
                {/* Mock form UI */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-slate-500 text-sm font-mono">form-builder.statelessforms.io</span>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="glass-card p-4">
                      <label className="text-sm text-slate-400 block mb-2">Full Name</label>
                      <div className="h-10 rounded-lg bg-slate-800 border border-slate-700" />
                    </div>
                    <div className="glass-card p-4">
                      <label className="text-sm text-slate-400 block mb-2">Email Address</label>
                      <div className="h-10 rounded-lg bg-slate-800 border border-slate-700" />
                    </div>
                    <div className="glass-card p-4">
                      <label className="text-sm text-slate-400 block mb-2">Message</label>
                      <div className="h-24 rounded-lg bg-slate-800 border border-slate-700" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center items-center text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 animate-float">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Submissions flow directly to your n8n webhook with HMAC signatures
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-1 rounded bg-slate-800">POST</span>
                      <span className="font-mono">→ your-n8n.cloud/webhook/...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 glass-card px-3 py-2 text-sm animate-float delay-200">
              <span className="text-green-400">✓</span> HMAC Signed
            </div>
            <div className="absolute -bottom-4 -left-4 glass-card px-3 py-2 text-sm animate-float delay-300">
              <span className="text-orange-400">⚡</span> Real-time relay
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why teams choose <span className="gradient-text">Stateless</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Privacy-first form infrastructure that integrates seamlessly with your automation stack
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Schema-Driven Forms</h3>
              <p className="text-slate-400">
                Multi-step wizards, conditional logic, repeatable sections, and real-time validation—all defined in JSON.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Zero Data Storage</h3>
              <p className="text-slate-400">
                We never store form answers. Only metadata for analytics. Your data, your servers, your control.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">n8n Native</h3>
              <p className="text-slate-400">
                HMAC-signed webhooks relay submissions instantly. Verify authenticity and route with confidence.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Custom Theming</h3>
              <p className="text-slate-400">
                Match your brand with custom colors, fonts, and styling. Embed anywhere with our JS snippet.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Rich Analytics</h3>
              <p className="text-slate-400">
                Track submissions, completion rates, and drop-off points. A/B test form variants to optimize conversions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="glass-card p-8 hover:border-indigo-500/30 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Multi-Tenant</h3>
              <p className="text-slate-400">
                Manage multiple clients or projects with isolated forms, webhooks, and analytics per tenant.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              How it works
            </h2>
            <p className="text-slate-400 text-lg">
              From form to workflow in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Design your form</h3>
              <p className="text-slate-400">
                Use our visual builder or write JSON schemas. Add steps, conditions, and validation rules.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Connect your webhook</h3>
              <p className="text-slate-400">
                Point to your n8n workflow URL. We'll sign every payload with HMAC for verification.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Embed & go live</h3>
              <p className="text-slate-400">
                Share a link, embed via iframe, or use our JS snippet. Submissions flow instantly to n8n.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border p-1">
            <div className="bg-slate-900 rounded-2xl p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to go stateless?
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
                  Join teams who've simplified their form infrastructure while keeping full control of their data.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/admin/forms/builder" className="btn-primary text-lg px-8 py-4">
                    Start building free
                  </Link>
                  <Link href="/pricing" className="btn-secondary text-lg px-8 py-4">
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4 gradient-text text-lg">Stateless Forms</h4>
              <p className="text-slate-500 text-sm">
                Privacy-first forms with real-time n8n relay. No answers stored, ever.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/admin/forms/builder" className="hover:text-white transition-colors">Form Builder</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/admin/docs/webhook-verification" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/admin/forms/new/templates" className="hover:text-white transition-colors">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-slate-300">Company</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><Link href="/signin" className="hover:text-white transition-colors">Sign in</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-slate-500 text-sm">© {new Date().getFullYear()} Stateless Forms. All rights reserved.</span>
            <div className="flex gap-6 text-sm text-slate-500">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
