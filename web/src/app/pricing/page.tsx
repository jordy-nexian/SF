import Link from "next/link";
import { PLANS, formatPrice } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  // Build tiers from the single source of truth (plans.ts)
  const tiers = [
    {
      name: PLANS.free.name,
      desc: PLANS.free.description,
      price: formatPrice(PLANS.free.pricing.monthly),
      period: PLANS.free.pricing.monthly > 0 ? "/month" : "",
      features: PLANS.free.features,
      cta: "Get started",
      href: "/signup",
      featured: false,
    },
    {
      name: PLANS.pro.name,
      desc: PLANS.pro.description,
      price: `$${PLANS.pro.pricing.monthly}`,
      period: "/month",
      features: PLANS.pro.features,
      cta: "Start free trial",
      href: "/signup",
      featured: PLANS.pro.popular || false,
    },
    {
      name: PLANS.enterprise.name,
      desc: PLANS.enterprise.description,
      price: `$${PLANS.enterprise.pricing.monthly}`,
      period: "/month",
      features: PLANS.enterprise.features,
      cta: "Contact sales",
      href: "mailto:sales@statelessforms.io",
      featured: false,
    },
  ];

  return (
    <div className="min-h-screen text-white pt-24 relative overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute rounded-full"
          style={{
            width: '500px',
            height: '500px',
            background: 'rgba(139, 92, 246, 0.3)',
            filter: 'blur(120px)',
            top: '-150px',
            left: '25%',
          }}
        />
        <div 
          className="absolute rounded-full"
          style={{
            width: '400px',
            height: '400px',
            background: 'rgba(99, 102, 241, 0.3)',
            filter: 'blur(120px)',
            bottom: '0',
            right: '0',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Simple, transparent{" "}
            <span 
              style={{
                background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              pricing
            </span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: '#94a3b8' }}>
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <div key={i} className="relative">
              {tier.featured && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold z-10"
                  style={{ background: 'linear-gradient(to right, #6366f1, #8b5cf6)' }}
                >
                  Most popular
                </div>
              )}
              <div 
                className={`h-full rounded-2xl ${tier.featured ? 'p-[2px]' : ''}`}
                style={tier.featured ? { background: 'linear-gradient(to right, #6366f1, #8b5cf6, #ec4899)' } : {}}
              >
                <div 
                  className="h-full rounded-2xl p-8 transition-all duration-300"
                  style={{ 
                    background: tier.featured ? '#0f172a' : 'rgba(255, 255, 255, 0.05)',
                    border: tier.featured ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold">{tier.name}</h2>
                    <p className="mt-1" style={{ color: '#94a3b8' }}>{tier.desc}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span style={{ color: '#94a3b8' }}>{tier.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3" style={{ color: '#cbd5e1' }}>
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link 
                    href={tier.href}
                    className="block w-full text-center py-3 rounded-full font-semibold transition-all"
                    style={tier.featured ? {
                      background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
                      color: 'white',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                    } : {
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                    }}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-20 text-center">
          <p className="mb-6" style={{ color: '#94a3b8' }}>Trusted by teams who value privacy and automation</p>
          <div className="flex flex-wrap justify-center gap-8" style={{ color: '#475569' }}>
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
