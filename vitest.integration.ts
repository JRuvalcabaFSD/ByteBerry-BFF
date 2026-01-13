import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			include: ['tests/integration/**/*.integration.test.ts'],
			fileParallelism: false,
			sequence: {
				concurrent: false,
				shuffle: false,
			},
			setupFiles: ['./tests/setup/setup.ts'],
			coverage: {
				enabled: false,
			},
			env: {
				NODE_ENV: 'test',
			},
		},
	})
);
