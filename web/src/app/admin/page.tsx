import Link from "next/link";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
	const hdrs = await headers();
	const host = hdrs.get("host");
	const baseEnv = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
	const base =
		baseEnv && /^https?:\/\//i.test(baseEnv)
			? baseEnv
			: host
			? `https://${host}`
			: "";

	const res = await fetch(`${base}/api/admin/forms`, { cache: "no-store" });
	// If running on the server without NEXT_PUBLIC_BASE_URL, relative fetch still works.
	const data = res.ok ? await res.json() : { forms: [] as any[] };
	const forms: { id: string; name: string; publicId: string; status: string; updatedAt: string }[] =
		data.forms ?? [];

	return (
		<div className="mx-auto max-w-6xl">
			<div className="mb-4 flex items-center justify-between">
				<h1 className="text-xl font-semibold">Forms</h1>
				<Link href="/admin/forms/new" className="rounded bg-black px-3 py-1.5 text-white">
					New form
				</Link>
			</div>
			<div className="overflow-x-auto rounded border bg-white">
				<table className="min-w-full text-left text-sm">
					<thead className="bg-gray-50 text-gray-600">
						<tr>
							<th className="px-4 py-2">Name</th>
							<th className="px-4 py-2">Public URL</th>
							<th className="px-4 py-2">Status</th>
							<th className="px-4 py-2">Updated</th>
						</tr>
					</thead>
					<tbody>
						{forms.map((f) => (
							<tr key={f.id} className="border-t">
								<td className="px-4 py-2">{f.name}</td>
								<td className="px-4 py-2">
									<Link className="text-blue-600" href={`/f/${f.publicId}`} target="_blank">
										/f/{f.publicId}
									</Link>
								</td>
								<td className="px-4 py-2 capitalize">{f.status}</td>
								<td className="px-4 py-2">{new Date(f.updatedAt).toLocaleString()}</td>
							</tr>
						))}
						{forms.length === 0 && (
							<tr>
								<td className="px-4 py-6 text-gray-600" colSpan={4}>
									No forms yet. Create one to get started.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}


