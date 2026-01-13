import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		silent: true,

		// Cobertura - deshabilitada por defecto para desarrollo
		coverage: {
			provider: 'v8',
			enabled: false, // Cambiado a false para que no se ejecute por defecto
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},
			include: ['src/**/*.{ts,tsx,js,jsx}'],
			exclude: [
				'**/*.d.ts',
				'**/*.config.{ts,js}',
				'src/app.ts', // Entry point
				'src/infrastructure/database/seed.ts', // seed de DB
				'src/container/factories.ts', // seed de DB
				'tests/**',
				'**/*.test.ts',
				'**/*.integration.test.ts',
				'**/*inMemory*',
			],
			reporter: ['text', 'html', 'clover', 'json', 'lcov'],
		},
	},
	plugins: [tsconfigPaths()],
});
