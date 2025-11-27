import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <section className="mt-8 rounded border bg-white p-8">
        <h1 className="text-3xl font-semibold">Stateless Forms → n8n</h1>
        <p className="mt-2 text-gray-600">
          Build schema‑driven forms, render them anywhere, and relay submissions to your
          n8n router workflow in real‑time. We never store answers; only metadata.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin" className="rounded bg-black px-4 py-2 text-white">
            Go to Admin
          </Link>
          <Link href="/admin/forms/new" className="rounded border px-4 py-2">
            Create a form
          </Link>
          <Link href="/signin" className="rounded border px-4 py-2">
            Sign in
          </Link>
          <Link href="/f/signup" className="rounded border px-4 py-2">
            Try sample runtime
          </Link>
        </div>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
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
    </div>
  );
}
