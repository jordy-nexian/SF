/**
 * Cloudflare Turnstile CAPTCHA verification
 * 
 * Turnstile is a privacy-focused CAPTCHA alternative that doesn't track users.
 * https://developers.cloudflare.com/turnstile/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileVerifyResult = {
	success: boolean;
	errorCodes?: string[];
	challenge_ts?: string;
	hostname?: string;
};

/**
 * Verify a Turnstile token server-side
 * @param token The token from the Turnstile widget (cf-turnstile-response)
 * @param ip Optional client IP address for additional verification
 * @returns Verification result
 */
export async function verifyTurnstileToken(
	token: string,
	ip?: string
): Promise<TurnstileVerifyResult> {
	const secretKey = process.env.TURNSTILE_SECRET_KEY;
	
	// If Turnstile is not configured, allow all requests (development mode)
	if (!secretKey) {
		if (process.env.NODE_ENV === 'production') {
			console.warn('[Turnstile] TURNSTILE_SECRET_KEY not configured in production!');
		}
		return { success: true };
	}
	
	// Empty token means widget wasn't rendered or user didn't complete
	if (!token || typeof token !== 'string') {
		return { 
			success: false, 
			errorCodes: ['missing-input-response'] 
		};
	}
	
	try {
		const formData = new URLSearchParams();
		formData.append('secret', secretKey);
		formData.append('response', token);
		if (ip) {
			formData.append('remoteip', ip);
		}
		
		const response = await fetch(TURNSTILE_VERIFY_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: formData.toString(),
		});
		
		if (!response.ok) {
			console.error('[Turnstile] Verification request failed:', response.status);
			return { 
				success: false, 
				errorCodes: ['http-error'] 
			};
		}
		
		const result = await response.json();
		
		return {
			success: result.success === true,
			errorCodes: result['error-codes'],
			challenge_ts: result.challenge_ts,
			hostname: result.hostname,
		};
	} catch (error) {
		console.error('[Turnstile] Verification error:', error instanceof Error ? error.message : 'unknown');
		// Fail open on network errors to not block legitimate users
		// This is a tradeoff - could fail closed in high-security scenarios
		return { success: true };
	}
}

/**
 * Check if Turnstile is configured
 */
export function isTurnstileEnabled(): boolean {
	return !!process.env.TURNSTILE_SECRET_KEY && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}

/**
 * Get the public site key for client-side widget
 */
export function getTurnstileSiteKey(): string | null {
	return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
}
