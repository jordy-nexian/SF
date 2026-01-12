/**
 * Standardized API Response Helpers
 * 
 * Provides consistent response format across all API routes:
 * {
 *   success: boolean,
 *   data?: T,           // Present on success
 *   error?: {           // Present on error
 *     code: string,     // Machine-readable error code
 *     message: string,  // Human-readable message
 *     details?: unknown // Optional additional context
 *   }
 * }
 */

import { NextResponse } from 'next/server';

// Standard error codes
export const ErrorCodes = {
	// Client errors (4xx)
	BAD_REQUEST: 'BAD_REQUEST',
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND',
	CONFLICT: 'CONFLICT',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	RATE_LIMITED: 'RATE_LIMITED',
	PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
	
	// Server errors (5xx)
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
	GATEWAY_ERROR: 'GATEWAY_ERROR',
	
	// Domain-specific
	FORM_NOT_FOUND: 'FORM_NOT_FOUND',
	FORM_NOT_PUBLISHED: 'FORM_NOT_PUBLISHED',
	FORM_ARCHIVED: 'FORM_ARCHIVED',
	WEBHOOK_FAILED: 'WEBHOOK_FAILED',
	CAPTCHA_FAILED: 'CAPTCHA_FAILED',
	USAGE_LIMIT_EXCEEDED: 'USAGE_LIMIT_EXCEEDED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface ApiError {
	code: ErrorCode;
	message: string;
	details?: unknown;
}

export interface ApiSuccessResponse<T> {
	success: true;
	data: T;
}

export interface ApiErrorResponse {
	success: false;
	error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response
 */
export function success<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
	return NextResponse.json({ success: true, data }, { status });
}

/**
 * Create an error response
 */
export function error(
	code: ErrorCode,
	message: string,
	status: number,
	details?: unknown,
	headers?: Record<string, string>
): NextResponse<ApiErrorResponse> {
	return NextResponse.json(
		{
			success: false,
			error: {
				code,
				message,
				...(details !== undefined && { details }),
			},
		},
		{ status, headers }
	);
}

// Convenience methods for common errors

export function badRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.BAD_REQUEST, message, 400, details);
}

export function unauthorized(message: string = 'Authentication required'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.UNAUTHORIZED, message, 401);
}

export function forbidden(message: string = 'Access denied'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.FORBIDDEN, message, 403);
}

export function notFound(message: string = 'Resource not found'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.NOT_FOUND, message, 404);
}

export function conflict(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.CONFLICT, message, 409, details);
}

export function validationError(message: string, errors?: unknown): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.VALIDATION_ERROR, message, 400, errors);
}

export function rateLimited(
	message: string = 'Too many requests',
	retryAfter: number
): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.RATE_LIMITED, message, 429, undefined, {
		'Retry-After': String(retryAfter),
	});
}

export function payloadTooLarge(message: string = 'Request payload too large'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.PAYLOAD_TOO_LARGE, message, 413);
}

export function internalError(message: string = 'An unexpected error occurred'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.INTERNAL_ERROR, message, 500);
}

export function serviceUnavailable(message: string = 'Service temporarily unavailable'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.SERVICE_UNAVAILABLE, message, 503);
}

export function gatewayError(message: string = 'Upstream service error'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.GATEWAY_ERROR, message, 502);
}

// Domain-specific errors

export function formNotFound(): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.FORM_NOT_FOUND, 'Form not found', 404);
}

export function formNotPublished(): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.FORM_NOT_PUBLISHED, 'This form is not yet published', 403);
}

export function formArchived(): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.FORM_ARCHIVED, 'This form has been archived', 404);
}

export function webhookFailed(message: string = 'Failed to deliver submission'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.WEBHOOK_FAILED, message, 502);
}

export function captchaFailed(): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.CAPTCHA_FAILED, 'Verification failed. Please try again.', 403);
}

export function usageLimitExceeded(message: string = 'Usage limit exceeded'): NextResponse<ApiErrorResponse> {
	return error(ErrorCodes.USAGE_LIMIT_EXCEEDED, message, 402);
}
