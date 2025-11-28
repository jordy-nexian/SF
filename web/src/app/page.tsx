import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: '#0f172a' }}>
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute rounded-full"
          style={{
            width: '600px',
            height: '600px',
            background: 'rgba(99, 102, 241, 0.3)',
            filter: 'blur(120px)',
            top: '-200px',
            left: '-200px',
          }}
        />
        <div 
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            background: 'rgba(139, 92, 246, 0.3)',
            filter: 'blur(120px)',
            top: '33%',
            right: '-150px',
          }}
        />
        <div 
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            background: 'rgba(249, 115, 22, 0.2)',
            filter: 'blur(120px)',
            bottom: '0',
            left: '25%',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div 
              className="px-4 py-2 flex items-center gap-2 text-sm rounded-full"
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span style={{ color: '#cbd5e1' }}>Now with n8n native integration</span>
            </div>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6">
            Forms that flow,{" "}
            <span 
              style={{
                background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              data that goes
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-center max-w-3xl mx-auto mb-10" style={{ color: '#94a3b8' }}>
            Build stunning, dynamic forms without storing a single answer. 
            Submissions relay instantly to your n8n workflows—signed, secure, and seamless.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/admin/forms/builder" 
              className="text-lg px-8 py-4 rounded-full font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
              }}
            >
              Start building free
            </Link>
            <Link 
              href="/features" 
              className="text-lg px-8 py-4 rounded-full font-semibold text-white transition-all flex items-center gap-2 hover:bg-white/5"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch demo
            </Link>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: '#64748b' }}>
            No credit card required • Answers never stored • GDPR compliant
          </p>

          {/* Hero visual - Form mockup */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            {/* Gradient border wrapper */}
            <div 
              className="p-[2px] rounded-2xl"
              style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6, #ec4899)' }}
            >
              <div className="rounded-2xl p-6 md:p-8" style={{ background: '#0f172a' }}>
                {/* Window chrome */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-sm font-mono" style={{ color: '#64748b' }}>form-builder.statelessforms.io</span>
                </div>
                
                {/* Form mockup content */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div 
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <label className="text-sm block mb-2" style={{ color: '#94a3b8' }}>Full Name</label>
                      <div className="h-10 rounded-lg" style={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </div>
                    <div 
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <label className="text-sm block mb-2" style={{ color: '#94a3b8' }}>Email Address</label>
                      <div className="h-10 rounded-lg" style={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </div>
                    <div 
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    >
                      <label className="text-sm block mb-2" style={{ color: '#94a3b8' }}>Message</label>
                      <div className="h-24 rounded-lg" style={{ background: '#1e293b', border: '1px solid #334155' }} />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center items-center text-center p-8">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ background: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)' }}
                    >
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color: '#94a3b8' }}>
                      Submissions flow directly to your n8n webhook with HMAC signatures
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                      <span className="px-2 py-1 rounded" style={{ background: '#1e293b' }}>POST</span>
                      <span className="font-mono">→ your-n8n.cloud/webhook/...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <div 
              className="absolute -top-3 -right-3 rounded-lg px-3 py-2 text-sm shadow-xl"
              style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid #334155' }}
            >
              <span className="text-green-400">✓</span> HMAC Signed
            </div>
            <div 
              className="absolute -bottom-3 -left-3 rounded-lg px-3 py-2 text-sm shadow-xl"
              style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid #334155' }}
            >
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
              Why teams choose{" "}
              <span 
                style={{
                  background: 'linear-gradient(to right, #818cf8, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Stateless
              </span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>
              Privacy-first form infrastructure that integrates seamlessly with your automation stack
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                gradient: "linear-gradient(to bottom right, #6366f1, #8b5cf6)",
                title: "Schema-Driven Forms",
                desc: "Multi-step wizards, conditional logic, repeatable sections, and real-time validation—all defined in JSON.",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              },
              {
                gradient: "linear-gradient(to bottom right, #f97316, #ef4444)",
                title: "Zero Data Storage",
                desc: "We never store form answers. Only metadata for analytics. Your data, your servers, your control.",
                icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              },
              {
                gradient: "linear-gradient(to bottom right, #10b981, #059669)",
                title: "n8n Native",
                desc: "HMAC-signed webhooks relay submissions instantly. Verify authenticity and route with confidence.",
                icon: "M13 10V3L4 14h7v7l9-11h-7z"
              },
              {
                gradient: "linear-gradient(to bottom right, #06b6d4, #3b82f6)",
                title: "Custom Theming",
                desc: "Match your brand with custom colors, fonts, and styling. Embed anywhere with our JS snippet.",
                icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              },
              {
                gradient: "linear-gradient(to bottom right, #ec4899, #f43f5e)",
                title: "Rich Analytics",
                desc: "Track submissions, completion rates, and drop-off points. A/B test form variants to optimize conversions.",
                icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              },
              {
                gradient: "linear-gradient(to bottom right, #8b5cf6, #7c3aed)",
                title: "Multi-Tenant",
                desc: "Manage multiple clients or projects with isolated forms, webhooks, and analytics per tenant.",
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1"
                style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: feature.gradient }}
                >
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p style={{ color: '#94a3b8' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">How it works</h2>
            <p className="text-lg" style={{ color: '#94a3b8' }}>From form to workflow in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "1", gradient: "linear-gradient(to bottom right, #6366f1, #8b5cf6)", title: "Design your form", desc: "Use our visual builder or write JSON schemas. Add steps, conditions, and validation rules." },
              { num: "2", gradient: "linear-gradient(to bottom right, #f97316, #ef4444)", title: "Connect your webhook", desc: "Point to your n8n workflow URL. We'll sign every payload with HMAC for verification." },
              { num: "3", gradient: "linear-gradient(to bottom right, #10b981, #059669)", title: "Embed & go live", desc: "Share a link, embed via iframe, or use our JS snippet. Submissions flow instantly to n8n." }
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg"
                  style={{ background: step.gradient }}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p style={{ color: '#94a3b8' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div 
            className="p-[2px] rounded-2xl"
            style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6, #ec4899)' }}
          >
            <div className="rounded-2xl p-12 text-center relative overflow-hidden" style={{ background: '#0f172a' }}>
              <div 
                className="absolute inset-0" 
                style={{ background: 'linear-gradient(to bottom right, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))' }} 
              />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to go stateless?</h2>
                <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: '#94a3b8' }}>
                  Join teams who've simplified their form infrastructure while keeping full control of their data.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/admin/forms/builder" 
                    className="text-lg px-8 py-4 rounded-full font-semibold text-white transition-all"
                    style={{
                      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    Start building free
                  </Link>
                  <Link 
                    href="/pricing" 
                    className="text-lg px-8 py-4 rounded-full font-semibold text-white transition-all hover:bg-white/5"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
                  >
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 relative" style={{ borderTop: '1px solid #1e293b' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 
                className="font-semibold mb-4 text-lg"
                style={{
                  background: 'linear-gradient(to right, #818cf8, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Stateless Forms
              </h4>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Privacy-first forms with real-time n8n relay. No answers stored, ever.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: '#cbd5e1' }}>Product</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#64748b' }}>
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/admin/forms/builder" className="hover:text-white transition-colors">Form Builder</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: '#cbd5e1' }}>Resources</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#64748b' }}>
                <li><Link href="/admin/docs/webhook-verification" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/admin/forms/new/templates" className="hover:text-white transition-colors">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4" style={{ color: '#cbd5e1' }}>Company</h4>
              <ul className="space-y-2 text-sm" style={{ color: '#64748b' }}>
                <li><Link href="/signin" className="hover:text-white transition-colors">Sign in</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #1e293b' }}>
            <span className="text-sm" style={{ color: '#64748b' }}>© {new Date().getFullYear()} Stateless Forms. All rights reserved.</span>
            <div className="flex gap-6 text-sm" style={{ color: '#64748b' }}>
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
