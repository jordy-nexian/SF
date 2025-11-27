import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <section className="mt-10 grid items-center gap-8 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-semibold leading-tight">
            Privacy‑first forms that deliver data straight to your n8n
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Build beautiful, dynamic forms without storing a single answer. Submissions are relayed in
            real‑time to your n8n router workflow—signed and secure.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/forms/new" className="rounded bg-black px-5 py-2.5 text-white">
              Get started
            </Link>
            <Link href="/features" className="rounded border px-5 py-2.5">
              See features
            </Link>
          </div>
          <p className="mt-3 text-xs text-gray-500">No credit card. Answers never stored.</p>
        </div>
        <div className="rounded border bg-white p-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Why teams choose us</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Schema‑driven renderer: steps, conditions, repeatables</li>
            <li>• HMAC‑signed relay to your n8n webhook</li>
            <li>• Metadata‑only logging for usage analytics</li>
            <li>• Easy embeds: hosted link, iframe, JS snippet</li>
          </ul>
        </div>
      </section>
      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <h3 className="font-medium">Schema‑driven</h3>
          <p className="text-sm text-gray-600">Steps, conditions, repeatables, and validation.</p>
        </div>
        <div className="rounded border bg-white p-4">
          <h3 className="font-medium">No answer storage</h3>
          <p className="text-sm text-gray-600">We only persist submission metadata for analytics.</p>
        </div>
        <div className="rounded border bg-white p-4">
          <h3 className="font-medium">n8n relay with HMAC</h3>
          <p className="text-sm text-gray-600">Signed POST to your router webhook per tenant.</p>
        </div>
      </section>
      <footer className="mt-12 border-t py-6 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Stateless Forms</span>
          <div className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/features">Product</Link>
            <Link href="/signin">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
