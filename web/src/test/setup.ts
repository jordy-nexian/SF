/**
 * Test setup file
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables for tests
beforeAll(() => {
	// Set test environment
	process.env.NODE_ENV = 'test';
	
	// Mock database URL (tests should use mocks, not real DB)
	process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
	
	// Mock secrets
	process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
	process.env.NEXTAUTH_URL = 'http://localhost:3000';
});

afterEach(() => {
	// Clear all mocks after each test
	vi.clearAllMocks();
});

afterAll(() => {
	// Cleanup after all tests
	vi.restoreAllMocks();
});

// Mock console.error to avoid noise in tests (optional)
// Uncomment if you want to suppress console.error in tests
// vi.spyOn(console, 'error').mockImplementation(() => {});
