import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import js from '@eslint/js';

export default defineConfig([
	{
		ignores: [
			'coverage/**',
			'.vscode/**',
			'dist/**',
			'.github/**',
			'docs/**',
			'tests/**',
			'logs/**',
			'node_modules/**',
			'scripts/**',
			'generated/**',
			'prisma/*.ts',
			'*.ejs',
		],
	},
	{
		...js.configs.recommended,
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		languageOptions: { globals: globals.node },
	},
	...tseslint.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		rules: {
			'no-console': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
			'prettier/prettier': [
				'warn',
				{
					singleQuote: true,
					printWidth: 140,
					semi: true,
					tabWidth: 2,
					trailingComma: 'es5',
					endOfLine: 'auto',
				},
			],
		},
	},
]);
