/**
 * Lightweight structured logger for serverless environments
 * Compatible with Vercel and Next.js 16+ Turbopack
 */

import { customAlphabet } from 'nanoid';

const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const currentLevel = LOG_LEVELS[(process.env.LOG_LEVEL as LogLevel) || 'info'] ?? LOG_LEVELS.info;

// Sensitive fields to redact
const REDACT_FIELDS = new Set([
	'password',
	'token',
	'secret',
	'authorization',
	'cookie',
	'apiKey',
	'api_key',
]);

function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (REDACT_FIELDS.has(key.toLowerCase())) {
			result[key] = '***REDACTED***';
		} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			result[key] = redactSensitive(value as Record<string, unknown>);
		} else {
			result[key] = value;
		}
	}
	return result;
}

interface LogEntry {
	level: LogLevel;
	timestamp: string;
	message: string;
	requestId?: string;
	path?: string;
	[key: string]: unknown;
}

function formatLog(level: LogLevel, context: Record<string, unknown>, message: string): string {
	const entry: LogEntry = {
		level,
		timestamp: new Date().toISOString(),
		message,
		...redactSensitive(context),
	};

	// In production, output JSON for log aggregators
	if (process.env.NODE_ENV === 'production') {
		return JSON.stringify(entry);
	}

	// In development, output human-readable format
	const { timestamp, requestId, path, ...rest } = entry;
	const prefix = requestId ? `[${requestId}]` : '';
	const pathInfo = path ? ` ${path}` : '';
	const extras = Object.keys(rest).length > 2 ? ` ${JSON.stringify(rest)}` : '';
	
	return `${timestamp} ${level.toUpperCase().padEnd(5)} ${prefix}${pathInfo} ${message}${extras}`;
}

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVELS[level] >= currentLevel;
}

export interface Logger {
	debug: (context: Record<string, unknown>, message: string) => void;
	info: (context: Record<string, unknown>, message: string) => void;
	warn: (context: Record<string, unknown>, message: string) => void;
	error: (context: Record<string, unknown>, message: string) => void;
	child: (defaultContext: Record<string, unknown>) => Logger;
}

function createLogger(defaultContext: Record<string, unknown> = {}): Logger {
	const log = (level: LogLevel, context: Record<string, unknown>, message: string) => {
		if (!shouldLog(level)) return;
		
		const mergedContext = { ...defaultContext, ...context };
		const formatted = formatLog(level, mergedContext, message);
		
		switch (level) {
			case 'debug':
			case 'info':
				console.log(formatted);
				break;
			case 'warn':
				console.warn(formatted);
				break;
			case 'error':
				console.error(formatted);
				break;
		}
	};

	return {
		debug: (context, message) => log('debug', context, message),
		info: (context, message) => log('info', context, message),
		warn: (context, message) => log('warn', context, message),
		error: (context, message) => log('error', context, message),
		child: (childContext) => createLogger({ ...defaultContext, ...childContext }),
	};
}

// Default logger instance
export const logger = createLogger();

// Generate a unique request ID
export function generateRequestId(): string {
	return `req_${generateId()}`;
}

// Create a request-scoped logger
export function createRequestLogger(requestId: string, path: string): Logger {
	return logger.child({ requestId, path });
}

// Structured event loggers - using flexible Record types for compatibility
export function logSubmissionEvent(log: Logger, event: Record<string, unknown>) {
	const status = event.status ?? event.type;
	const isError = status === 'error' || status === 'failed';
	const level = isError ? 'error' : 'info';
	const submissionId = event.submissionId ?? 'unknown';
	log[level](event, `Submission ${status}: ${submissionId}`);
}

export function logWebhookEvent(log: Logger, event: Record<string, unknown>) {
	const status = event.status ?? event.type;
	const isError = status === 'error' || status === 'failed';
	const level = isError ? 'warn' : 'info';
	const isBackup = event.isBackup ? ' (backup)' : '';
	const httpCode = event.httpCode ?? event.status ?? 'N/A';
	log[level](event, `Webhook ${status}${isBackup}: ${httpCode}`);
}

export function logRateLimitEvent(log: Logger, event: Record<string, unknown>) {
	const blocked = event.blocked;
	if (blocked) {
		log.warn(event, `Rate limit blocked: ${event.ip ?? event.key}`);
	} else {
		log.debug(event, `Rate limit checked: ${event.remaining}/${event.limit}`);
	}
}

export function logCaptchaEvent(log: Logger, event: Record<string, unknown>) {
	if (event.success) {
		log.info(event, 'CAPTCHA verification successful');
	} else {
		log.warn(event, `CAPTCHA verification failed: ${event.error || 'unknown'}`);
	}
}
