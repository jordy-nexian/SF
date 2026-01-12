/**
 * API response helper tests
 */

import { describe, it, expect } from 'vitest';
import {
	success,
	error,
	badRequest,
	unauthorized,
	forbidden,
	notFound,
	conflict,
	validationError,
	rateLimited,
	internalError,
	formNotFound,
	ErrorCodes,
} from '../api-response';

describe('success', () => {
	it('creates success response with data', async () => {
		const response = success({ id: '123', name: 'Test' });
		const body = await response.json();

		expect(body.success).toBe(true);
		expect(body.data).toEqual({ id: '123', name: 'Test' });
	});

	it('defaults to 200 status', () => {
		const response = success({ test: true });

		expect(response.status).toBe(200);
	});

	it('allows custom status code', () => {
		const response = success({ created: true }, 201);

		expect(response.status).toBe(201);
	});
});

describe('error', () => {
	it('creates error response with code and message', async () => {
		const response = error(ErrorCodes.BAD_REQUEST, 'Something went wrong', 400);
		const body = await response.json();

		expect(body.success).toBe(false);
		expect(body.error.code).toBe('BAD_REQUEST');
		expect(body.error.message).toBe('Something went wrong');
	});

	it('includes details when provided', async () => {
		const details = { field: 'email', issue: 'invalid format' };
		const response = error(ErrorCodes.VALIDATION_ERROR, 'Invalid data', 400, details);
		const body = await response.json();

		expect(body.error.details).toEqual(details);
	});

	it('sets correct status code', () => {
		const response = error(ErrorCodes.NOT_FOUND, 'Not found', 404);

		expect(response.status).toBe(404);
	});
});

describe('convenience methods', () => {
	it('badRequest returns 400', async () => {
		const response = badRequest('Invalid input');
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BAD_REQUEST');
	});

	it('unauthorized returns 401', async () => {
		const response = unauthorized();
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error.code).toBe('UNAUTHORIZED');
		expect(body.error.message).toBe('Authentication required');
	});

	it('forbidden returns 403', async () => {
		const response = forbidden();
		const body = await response.json();

		expect(response.status).toBe(403);
		expect(body.error.code).toBe('FORBIDDEN');
	});

	it('notFound returns 404', async () => {
		const response = notFound('User not found');
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error.code).toBe('NOT_FOUND');
		expect(body.error.message).toBe('User not found');
	});

	it('conflict returns 409', async () => {
		const response = conflict('Email already exists');
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.error.code).toBe('CONFLICT');
	});

	it('validationError returns 400 with details', async () => {
		const errors = [{ field: 'name', message: 'Required' }];
		const response = validationError('Validation failed', errors);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error.code).toBe('VALIDATION_ERROR');
		expect(body.error.details).toEqual(errors);
	});

	it('rateLimited returns 429 with Retry-After header', () => {
		const response = rateLimited('Too many requests', 60);

		expect(response.status).toBe(429);
		expect(response.headers.get('Retry-After')).toBe('60');
	});

	it('internalError returns 500', async () => {
		const response = internalError();
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error.code).toBe('INTERNAL_ERROR');
	});
});

describe('domain-specific errors', () => {
	it('formNotFound returns correct error', async () => {
		const response = formNotFound();
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error.code).toBe('FORM_NOT_FOUND');
		expect(body.error.message).toBe('Form not found');
	});
});

describe('ErrorCodes', () => {
	it('has all expected error codes', () => {
		expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
		expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
		expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
		expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
		expect(ErrorCodes.CONFLICT).toBe('CONFLICT');
		expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
		expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
		expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
		expect(ErrorCodes.FORM_NOT_FOUND).toBe('FORM_NOT_FOUND');
		expect(ErrorCodes.WEBHOOK_FAILED).toBe('WEBHOOK_FAILED');
		expect(ErrorCodes.CAPTCHA_FAILED).toBe('CAPTCHA_FAILED');
	});
});
