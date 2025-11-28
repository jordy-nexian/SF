import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function addSecurityHeaders(resp: NextResponse, isEmbed = false) {
	// HSTS for production
	if (process.env.NODE_ENV === 'production') {
		resp.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		);
	}

	// Content Security Policy
	// For embeddable forms, we need to allow framing from any origin
	const frameAncestors = isEmbed ? '*' : "'self'";
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
		"style-src 'self' 'unsafe-inline'", // Tailwind uses inline styles
		"img-src 'self' data: https:",
		"font-src 'self' https://fonts.gstatic.com",
		"connect-src 'self' https:",
		`frame-ancestors ${frameAncestors}`,
		"base-uri 'self'",
		"form-action 'self'",
	].join('; ');

	resp.headers.set('Content-Security-Policy', csp);

	// Additional security headers
	resp.headers.set('X-Content-Type-Options', 'nosniff');
	resp.headers.set('X-Frame-Options', isEmbed ? 'ALLOWALL' : 'SAMEORIGIN');
	resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	resp.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return resp;
}

const PUBLIC_API = /^\/api\/forms\//;
const ADMIN_API = /^\/api\/admin\//;
const PUBLIC_FORM_PAGE = /^\/f\//;

export function middleware(req: NextRequest) {
	const { method, nextUrl } = req;
	const pathname = nextUrl.pathname;

	// Check if this is an embedded form (has ?embed=true)
	const isEmbed = nextUrl.searchParams.get('embed') === 'true' || PUBLIC_FORM_PAGE.test(pathname);

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
			return addSecurityHeaders(preflight, true);
		}
		const resp = NextResponse.next();
		resp.headers.set('Access-Control-Allow-Origin', '*');
		return addSecurityHeaders(resp, true);
	}

	// Restrict admin APIs (no cross-origin for now)
	if (ADMIN_API.test(pathname)) {
		if (method === 'OPTIONS') {
			return addSecurityHeaders(new NextResponse(null, { status: 204 }));
		}
		return addSecurityHeaders(NextResponse.next());
	}

	// Public form pages (embeddable)
	if (PUBLIC_FORM_PAGE.test(pathname)) {
		return addSecurityHeaders(NextResponse.next(), true);
	}

	return addSecurityHeaders(NextResponse.next());
}

export const config = {
	matcher: ['/api/:path*', '/f/:path*', '/'],
};


