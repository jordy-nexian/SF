import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getUsage(tenantId: string) {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  const base =
    baseEnv && /^https?:\/\//i.test(baseEnv)
      ? baseEnv
      : host
      ? `https://${host}`
      : "";
  const res = await fetch(`${base}/api/admin/tenants/${tenantId}/usage`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function UsagePage() {
  const session = await getServerSession(authOptions);
  const tenantId = (session as any)?.user?.tenantId as string | undefined;
  if (!tenantId) {
    return <div className="p-6">No tenant in session.</div>;
  }
  const usage = await getUsage(tenantId);
  if (!usage) {
    return <div className="p-6">Failed to load usage.</div>;
  }
  const counts = usage.counts || {};

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-4 text-xl font-semibold">Usage (last 30 days)</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Submissions</div>
          <div className="mt-1 text-2xl font-semibold">{(counts.success || 0) + (counts.error || 0)}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Success</div>
          <div className="mt-1 text-2xl font-semibold text-green-700">{counts.success || 0}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Errors</div>
          <div className="mt-1 text-2xl font-semibold text-red-700">{counts.error || 0}</div>
        </div>
      </div>
      <div className="mt-4 rounded border bg-white p-4">
        <div className="text-sm text-gray-600">Average latency to n8n (ms)</div>
        <div className="mt-1 text-2xl font-semibold">{Math.round(usage.averageLatencyMs || 0)}</div>
      </div>
    </div>
  );
}


