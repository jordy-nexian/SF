import crypto from 'node:crypto';

export type HmacHeader = {
	signature: string;
	timestamp: string;
	algorithm: 'sha256';
};

export interface HmacVerifyResult {
	valid: boolean;
	error?: string;
}

// --- Outbound: sign requests ---

export function createHmacSignature(payload: string, secret: string): HmacHeader {
	const timestamp = new Date().toISOString();
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(timestamp + '.' + payload, 'utf8');
	const signature = hmac.digest('hex');
	return { signature, timestamp, algorithm: 'sha256' };
}

export function buildSignatureHeaders(header: HmacHeader): Record<string, string> {
	return {
		'X-Form-Signature': header.signature,
		'X-Form-Signature-Alg': header.algorithm,
		'X-Form-Signature-Ts': header.timestamp,
	};
}

// --- Inbound: verify responses ---

const DEFAULT_MAX_AGE_SEC = 300; // 5 minutes

/**
 * Extract HMAC signature headers from a fetch Response.
 * Returns null if any required header is missing.
 */
export function extractSignatureHeaders(response: Response): HmacHeader | null {
	const signature = response.headers.get('X-Form-Signature');
	const algorithm = response.headers.get('X-Form-Signature-Alg');
	const timestamp = response.headers.get('X-Form-Signature-Ts');

	if (!signature || !algorithm || !timestamp) {
		return null;
	}

	return { signature, timestamp, algorithm: algorithm as 'sha256' };
}

/**
 * Verify an HMAC signature on an inbound response body.
 * Uses timing-safe comparison to prevent side-channel leaks.
 *
 * Returns { valid: true } on success, or { valid: false, error: '...' }
 * with a descriptive message for debugging.
 */
export function verifyHmacSignature(
	rawBody: string,
	headers: HmacHeader,
	secret: string,
	maxAgeSec: number = DEFAULT_MAX_AGE_SEC,
): HmacVerifyResult {
	// 1. Check algorithm
	if (headers.algorithm !== 'sha256') {
		return {
			valid: false,
			error: `HMAC mismatch: unsupported algorithm "${headers.algorithm}", expected "sha256"`,
		};
	}

	// 2. Check timestamp freshness
	const ts = new Date(headers.timestamp);
	if (isNaN(ts.getTime())) {
		return {
			valid: false,
			error: `HMAC mismatch: invalid timestamp format "${headers.timestamp}"`,
		};
	}

	const ageMs = Math.abs(Date.now() - ts.getTime());
	if (ageMs > maxAgeSec * 1000) {
		return {
			valid: false,
			error: `HMAC mismatch: timestamp expired (age ${Math.round(ageMs / 1000)}s exceeds ${maxAgeSec}s window)`,
		};
	}

	// 3. Recompute HMAC
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(headers.timestamp + '.' + rawBody, 'utf8');
	const expected = hmac.digest('hex');

	// 4. Timing-safe comparison
	const sigBuffer = Buffer.from(headers.signature, 'utf8');
	const expBuffer = Buffer.from(expected, 'utf8');

	if (sigBuffer.length !== expBuffer.length) {
		return {
			valid: false,
			error: 'HMAC mismatch: signature length mismatch (response may have been tampered with)',
		};
	}

	if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
		return {
			valid: false,
			error: 'HMAC mismatch: signature does not match (response body or secret may differ)',
		};
	}

	return { valid: true };
}
