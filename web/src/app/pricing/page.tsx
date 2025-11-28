import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white pt-24 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px] -top-32 left-1/4" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-600/30 rounded-full blur-[120px] bottom-0 right-0" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Simple, transparent{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              pricing
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {/* Free tier */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Free</h2>
              <p className="text-slate-400 mt-1">For testing and small projects</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["500 submissions / month", "3 forms", "Basic analytics", "Hosted embeds"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link 
              href="/signin" 
              className="block w-full text-center py-3 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all"
            >
              Get started
            </Link>
          </div>

          {/* Pro tier */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-xs font-semibold z-10">
              Most popular
            </div>
            <div className="p-[1px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full">
              <div className="bg-slate-900 rounded-2xl p-8 h-full">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Pro</h2>
                  <p className="text-slate-400 mt-1">For growing teams</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {["10,000 submissions / month", "Unlimited forms", "Custom themes & branding", "A/B testing", "Priority support"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300">
                      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link 
                  href="/signin" 
                  className="block w-full text-center py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all"
                >
                  Start free trial
                </Link>
              </div>
            </div>
          </div>

          {/* Enterprise tier */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Enterprise</h2>
              <p className="text-slate-400 mt-1">For critical workflows</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold">Custom</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["Unlimited submissions", "SSO & advanced security", "Custom SLAs", "Dedicated support", "Custom domains"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <a 
              href="mailto:sales@statelessforms.io" 
              className="block w-full text-center py-3 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600 transition-all"
            >
              Contact sales
            </a>
          </div>
        </div>

        {/* Trust signals */}
        <div className="mt-20 text-center">
          <p className="text-slate-400 mb-6">Trusted by teams who value privacy and automation</p>
          <div className="flex flex-wrap justify-center gap-8 text-slate-600">
            <span className="text-lg font-semibold">n8n</span>
            <span className="text-lg font-semibold">Make</span>
            <span className="text-lg font-semibold">Zapier</span>
            <span className="text-lg font-semibold">Pipedream</span>
          </div>
        </div>
      </div>
    </div>
  );
}
