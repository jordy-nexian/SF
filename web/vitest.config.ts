import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		// Test environment
		environment: 'node',
		
		// Setup files
		setupFiles: ['./src/test/setup.ts'],
		
		// Include patterns
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		
		// Exclude patterns
		exclude: ['node_modules', '.next', 'dist'],
		
		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'.next/**',
				'**/*.d.ts',
				'**/*.config.*',
				'**/types/**',
			],
		},
		
		// Global setup
		globals: true,
		
		// Timeout
		testTimeout: 10000,
		
		// Reporter
		reporters: ['verbose'],
	},
	
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
