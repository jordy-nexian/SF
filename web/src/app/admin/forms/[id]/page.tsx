import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

async function getForm(id: string) {
  const hdrs = headers();
  const host = hdrs.get("host");
  const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  const base =
    baseEnv && /^https?:\/\//i.test(baseEnv)
      ? baseEnv
      : host
      ? `https://${host}`
      : "";
  const res = await fetch(`${base}/api/admin/forms/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function FormDetail({ params }: { params: { id: string } }) {
  const data = await getForm(params.id);
  if (!data) {
    return <div className="p-6">Form not found.</div>;
  }
  const hosted = `/f/${data.publicId}`;
  const iframeSnippet = `<iframe src="${hosted}" width="100%" height="700" frameborder="0"></iframe>`;

  async function setCurrent(versionId: string) {
    "use server";
    const hdrs = headers();
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
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{data.name}</h1>
        <Link href="/admin" className="text-sm text-blue-600">← Back</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Versions</h2>
          <ul className="space-y-2">
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

        <div className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-gray-700">Embed</h2>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-600 mb-1">Hosted URL</div>
              <code className="block rounded bg-gray-50 p-2 text-xs">{hosted}</code>
            </div>
            <div>
              <div className="text-xs text-gray-600 mb-1">Iframe</div>
              <pre className="whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs">{iframeSnippet}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


