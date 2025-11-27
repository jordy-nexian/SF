export const dynamic = "force-dynamic";

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-semibold">Product</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Schema‑driven runtime</h2>
          <p className="mt-2 text-gray-700 text-sm">
            Render forms from JSON with steps, conditional visibility, repeatables, and validation.
          </p>
        </div>
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">n8n relay with HMAC</h2>
          <p className="mt-2 text-gray-700 text-sm">
            Submissions are forwarded to your n8n router webhook, signed with a per‑tenant secret.
            We never store answers—only metadata for analytics.
          </p>
        </div>
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Embeds & runtime</h2>
          <p className="mt-2 text-gray-700 text-sm">
            Hosted URL, iframe, and JS embed to drop forms anywhere with a great UX.
          </p>
        </div>
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Theming</h2>
          <p className="mt-2 text-gray-700 text-sm">
            Tenant themes using CSS variables; apply per form for brand‑consistent experiences.
          </p>
        </div>
      </div>
    </div>
  );
}


