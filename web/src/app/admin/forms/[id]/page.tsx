import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import WebhookTestButton from "@/components/WebhookTestButton";

export const dynamic = "force-dynamic";

async function getBaseUrl() {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  return baseEnv && /^https?:\/\//i.test(baseEnv)
    ? baseEnv
    : host
    ? `https://${host}`
    : "";
}

async function getForm(id: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/admin/forms/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getFormStats(id: string) {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/admin/forms/${id}/stats`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800" },
  live: { label: "Live", color: "bg-green-100 text-green-800" },
  archived: { label: "Archived", color: "bg-gray-100 text-gray-600" },
};

export default async function FormDetail({ params }: { params: { id: string } }) {
  const [data, stats] = await Promise.all([
    getForm(params.id),
    getFormStats(params.id),
  ]);
  if (!data) {
    return <div className="p-6">Form not found.</div>;
  }
  const hosted = `/f/${data.publicId}`;
  const iframeSnippet = `<iframe src="${hosted}" width="100%" height="700" frameborder="0"></iframe>`;
  const statusInfo = STATUS_LABELS[data.status] || STATUS_LABELS.draft;

  async function setCurrent(versionId: string) {
    "use server";
    const hdrs = await headers();
    const host = hdrs.get("host");
    const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
    const base =
      baseEnv && /^https?:\/\//i.test(baseEnv)
        ? baseEnv
        : host
        ? `https://${host}`
        : "";
    await fetch(`${base}/api/admin/forms/${params.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentVersionId: versionId }),
    });
    revalidatePath(`/admin/forms/${params.id}`);
  }

  async function setStatus(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    const hdrs = await headers();
    const host = hdrs.get("host");
    const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
    const base =
      baseEnv && /^https?:\/\//i.test(baseEnv)
        ? baseEnv
        : host
        ? `https://${host}`
        : "";
    await fetch(`${base}/api/admin/forms/${params.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    revalidatePath(`/admin/forms/${params.id}`);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{data.name}</h1>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <Link href="/admin" className="text-sm text-blue-600">← Back</Link>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded border bg-white p-4 text-center">
            <div className="text-2xl font-semibold">{stats.totalSubmissions}</div>
            <div className="text-xs text-gray-600">Total Submissions</div>
          </div>
          <div className="rounded border bg-white p-4 text-center">
            <div className="text-2xl font-semibold">{stats.last30Days.total}</div>
            <div className="text-xs text-gray-600">Last 30 Days</div>
          </div>
          <div className="rounded border bg-white p-4 text-center">
            <div className="text-2xl font-semibold text-green-600">{stats.last30Days.successRate}%</div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
          <div className="rounded border bg-white p-4 text-center">
            <div className="text-2xl font-semibold">{stats.last30Days.avgLatencyMs}ms</div>
            <div className="text-xs text-gray-600">Avg Latency</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status & Settings */}
        <div className="rounded border bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Status</h2>
          <form action={setStatus} className="flex items-center gap-3">
            <select
              name="status"
              defaultValue={data.status}
              className="rounded border px-3 py-1.5 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="archived">Archived</option>
            </select>
            <button
              type="submit"
              className="rounded bg-black px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Update
            </button>
          </form>
          <p className="mt-2 text-xs text-gray-500">
            Only <strong>Live</strong> forms accept public submissions.
          </p>

          <div className="mt-4 border-t pt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Webhook</h3>
            <WebhookTestButton formId={data.id} />
          </div>
        </div>

        {/* Versions */}
        <div className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Versions</h2>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {data.versions.map((v: any) => (
              <li key={v.id} className="flex items-center justify-between rounded border p-2">
                <div>
                  <div className="text-sm">v{v.versionNumber}</div>
                  <div className="text-xs text-gray-600">{new Date(v.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {data.currentVersionId === v.id ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Current</span>
                  ) : (
                    <form action={setCurrent.bind(null, v.id)}>
                      <button type="submit" className="rounded border px-2 py-1 text-xs">Set current</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Link href={`/admin/forms/${params.id}/versions/new`} className="text-sm text-blue-600">+ New version</Link>
          </div>
        </div>

        {/* Embed */}
        <div className="rounded border bg-white p-4 md:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Embed Options</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs text-gray-600 mb-1">Hosted URL</div>
              <code className="block rounded bg-gray-50 p-2 text-xs break-all">{hosted}</code>
              <p className="mt-1 text-xs text-gray-500">Direct link to the form</p>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Iframe Embed</div>
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">{iframeSnippet}</pre>
              <p className="mt-1 text-xs text-gray-500">Simple iframe integration</p>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">JS Embed</div>
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">{`<script src="/embed.js" data-form-id="${data.publicId}"></script>
<div id="stateless-form"></div>`}</pre>
              <p className="mt-1 text-xs text-gray-500">Auto-resizing with events</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


