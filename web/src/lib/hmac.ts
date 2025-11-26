import crypto from 'node:crypto';

export type HmacHeader = {
	signature: string;
	timestamp: string;
	algorithm: 'sha256';
};

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


