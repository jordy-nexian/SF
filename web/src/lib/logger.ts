/**
 * Structured logging using Pino
 * 
 * Provides consistent, JSON-formatted logs with request IDs for traceability.
 * In development, logs are pretty-printed; in production, JSON for log aggregators.
 */

import pino from 'pino';

// Log levels match Pino defaults
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Get log level from environment (default: info in prod, debug in dev)
const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 
	(process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create base logger
const baseLogger = pino({
	level,
	// Use pretty print in development
	...(process.env.NODE_ENV !== 'production' && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				ignore: 'pid,hostname',
				translateTime: 'SYS:HH:MM:ss.l',
			},
		},
	}),
	// Base configuration for all logs
	base: {
		env: process.env.NODE_ENV || 'development',
		service: 'stateless-forms',
	},
	// Custom serializers
	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err,
	},
	// Redact sensitive fields
	redact: {
		paths: [
			'password',
			'passwordHash',
			'token',
			'secret',
			'apiKey',
			'authorization',
			'cookie',
			'*.password',
			'*.passwordHash',
			'*.token',
			'*.secret',
			'*.apiKey',
		],
		censor: '[REDACTED]',
	},
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
	return baseLogger.child(context);
}

/**
 * Create a request-scoped logger with request ID
 */
export function createRequestLogger(requestId: string, path?: string) {
	return baseLogger.child({
		requestId,
		...(path && { path }),
	});
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
	return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Log submission event (no PII)
 */
export function logSubmissionEvent(
	logger: pino.Logger,
	event: {
		type: 'received' | 'validated' | 'relayed' | 'failed';
		formId: string;
		tenantId?: string;
		webhookStatus?: number;
		duration?: number;
		error?: string;
	}
) {
	const { type, formId, tenantId, webhookStatus, duration, error } = event;
	
	const logData = {
		event: `submission.${type}`,
		formId,
		...(tenantId && { tenantId }),
		...(webhookStatus && { webhookStatus }),
		...(duration !== undefined && { durationMs: duration }),
	};
	
	if (type === 'failed') {
		logger.error({ ...logData, error }, `Submission failed: ${error}`);
	} else if (type === 'relayed') {
		logger.info(logData, `Submission relayed to webhook`);
	} else {
		logger.debug(logData, `Submission ${type}`);
	}
}

/**
 * Log webhook relay event
 */
export function logWebhookEvent(
	logger: pino.Logger,
	event: {
		type: 'sending' | 'success' | 'failed' | 'retry';
		webhookUrl: string;
		formId: string;
		status?: number;
		duration?: number;
		error?: string;
		attempt?: number;
	}
) {
	// Mask webhook URL to prevent secret leakage
	const maskedUrl = maskWebhookUrl(event.webhookUrl);
	
	const logData = {
		event: `webhook.${event.type}`,
		webhookUrl: maskedUrl,
		formId: event.formId,
		...(event.status && { status: event.status }),
		...(event.duration !== undefined && { durationMs: event.duration }),
		...(event.attempt && { attempt: event.attempt }),
	};
	
	if (event.type === 'failed') {
		logger.error({ ...logData, error: event.error }, `Webhook delivery failed: ${event.error}`);
	} else if (event.type === 'success') {
		logger.info(logData, `Webhook delivered successfully`);
	} else if (event.type === 'retry') {
		logger.warn(logData, `Retrying webhook delivery`);
	} else {
		logger.debug(logData, `Sending webhook`);
	}
}

/**
 * Mask sensitive parts of webhook URL
 */
function maskWebhookUrl(url: string): string {
	try {
		const parsed = new URL(url);
		// Mask path after first segment
		const pathParts = parsed.pathname.split('/').filter(Boolean);
		if (pathParts.length > 1) {
			parsed.pathname = '/' + pathParts[0] + '/***';
		}
		// Remove query params
		parsed.search = '';
		return parsed.toString();
	} catch {
		return '[invalid-url]';
	}
}

/**
 * Log rate limit event
 */
export function logRateLimitEvent(
	logger: pino.Logger,
	event: {
		key: string;
		limit: number;
		remaining: number;
		blocked: boolean;
	}
) {
	if (event.blocked) {
		logger.warn(
			{
				event: 'rateLimit.blocked',
				key: maskRateLimitKey(event.key),
				limit: event.limit,
			},
			'Rate limit exceeded'
		);
	}
}

/**
 * Mask IP in rate limit key
 */
function maskRateLimitKey(key: string): string {
	// Mask last octet of IPv4
	return key.replace(/\d+\.\d+\.\d+\.(\d+)/, 'x.x.x.$1');
}

// Export the base logger for simple cases
export const logger = baseLogger;
export default baseLogger;
