import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-3xl font-semibold">Pricing</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Free</h2>
          <p className="mt-1 text-gray-600 text-sm">For testing and small projects.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>• 500 submissions / month</li>
            <li>• Basic analytics</li>
            <li>• Hosted embeds</li>
          </ul>
          <Link href="/signin" className="mt-4 inline-block rounded border px-4 py-2">Get started</Link>
        </div>
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Pro</h2>
          <p className="mt-1 text-gray-600 text-sm">For growing teams.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>• Higher submission limits</li>
            <li>• Themes and embeds</li>
            <li>• Priority support</li>
          </ul>
          <Link href="/signin" className="mt-4 inline-block rounded bg-black px-4 py-2 text-white">Start trial</Link>
        </div>
        <div className="rounded border bg-white p-6">
          <h2 className="text-xl font-medium">Enterprise</h2>
          <p className="mt-1 text-gray-600 text-sm">For critical workflows.</p>
          <ul className="mt-3 space-y-1 text-sm text-gray-700">
            <li>• SSO & advanced security</li>
            <li>• Custom SLAs</li>
            <li>• Dedicated support</li>
          </ul>
          <a href="mailto:sales@example.com" className="mt-4 inline-block rounded border px-4 py-2">Contact sales</a>
        </div>
      </div>
    </div>
  );
}



