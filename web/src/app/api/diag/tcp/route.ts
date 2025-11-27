import { NextResponse } from "next/server";
import dns from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDb() {
	try {
		const u = new URL(process.env.DATABASE_URL || "");
		return { host: u.hostname, port: Number(u.port || "5432") };
	} catch {
		return { host: null as any, port: 0 };
	}
}

export async function GET() {
	const { host, port } = parseDb();
	if (!host || !port) {
		return NextResponse.json({ ok: false, error: "Invalid DATABASE_URL" }, { status: 400 });
	}
	try {
		// Try IPv4 first explicitly, then IPv6
		const v4 = await dns.lookup(host, { all: true, family: 4 }).catch(() => []);
		const v6 = await dns.lookup(host, { all: true, family: 6 }).catch(() => []);
		const ips = [...v4, ...v6];
		const ipList = ips.length ? ips.map((i) => `${i.address}/${i.family}`).join(", ") : "none";
		const target = ips[0]?.address ?? host;

		const outcome = await new Promise<{ ok: boolean; code?: string; message?: string }>((resolve) => {
			const socket = net.connect({ host: target, port, timeout: 5000 }, () => {
				socket.destroy();
				resolve({ ok: true });
			});
			socket.on("error", (err: any) => {
				resolve({ ok: false, code: err?.code, message: String(err?.message || err) });
			});
			socket.on("timeout", () => {
				socket.destroy();
				resolve({ ok: false, code: "TIMEOUT", message: "TCP connect timeout" });
			});
		});

		return NextResponse.json({
			ok: outcome.ok,
			host,
			port,
			ips: ipList,
			error: outcome.ok ? undefined : { code: outcome.code, message: outcome.message },
		}, { status: outcome.ok ? 200 : 500 });
	} catch (err: any) {
		return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
	}
}


