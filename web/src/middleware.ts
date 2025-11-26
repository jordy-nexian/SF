import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function addHsts(resp: NextResponse) {
	if (process.env.NODE_ENV === 'production') {
		resp.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}
	return resp;
}

const PUBLIC_API = /^\/api\/forms\//;
const ADMIN_API = /^\/api\/admin\//;

export function middleware(req: NextRequest) {
	const { method, nextUrl } = req;
	const pathname = nextUrl.pathname;

	// Handle CORS for public APIs
	if (PUBLIC_API.test(pathname)) {
		if (method === 'OPTIONS') {
			const preflight = new NextResponse(null, { status: 204 });
			preflight.headers.set('Access-Control-Allow-Origin', '*');
			preflight.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
			preflight.headers.set(
				'Access-Control-Allow-Headers',
				'content-type,x-form-signature,x-form-signature-alg,x-form-signature-ts'
			);
			preflight.headers.set('Access-Control-Max-Age', '86400');
			return addHsts(preflight);
		}
		const resp = NextResponse.next();
		resp.headers.set('Access-Control-Allow-Origin', '*');
		return addHsts(resp);
	}

	// Restrict admin APIs (no cross-origin for now)
	if (ADMIN_API.test(pathname)) {
		if (method === 'OPTIONS') {
			return addHsts(new NextResponse(null, { status: 204 }));
		}
		return addHsts(NextResponse.next());
	}

	return addHsts(NextResponse.next());
}

export const config = {
	matcher: ['/api/:path*', '/f/:path*', '/'],
};


