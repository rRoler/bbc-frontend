import globals from 'globals';
import js from '@eslint/js';
import typescript from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import svelteConfig from './svelte.config.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...typescript.configs.recommended,
	...eslintPluginAstro.configs.recommended,
	...eslintPluginSvelte.configs['flat/recommended'],

	prettier,

	{
		name: 'global-config',
		files: ['*'],
		rules: {
			indent: ['error', 2],
			quotes: ['error', 'single', { avoidEscape: true }],
			semi: ['error', 'always'],
			'eol-last': ['error', 'always'],
		},
	},

	{
		name: 'global-typescript-config',
		files: ['**/*.{js,jsx,ts,tsx}'],
		languageOptions: {
			parser: typescript.parser,
			parserOptions: {
				project: './tsconfig.json',
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					disallowTypeAnnotations: true,
				},
			],
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},

	{
		name: 'astro-specific-rules',
		files: ['**/*.astro'],
		rules: {
			'astro/no-set-html-directive': 'warn',
		},
	},

	{
		name: 'svelte-specific-rules',
		files: ['**/*.svelte'],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				svelteConfig,
				ecmaVersion: 'latest',
				sourceType: 'module',
				parser: typescript.parser,
			},
		},
		rules: {
			'svelte/no-at-html-tags': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
		},
	},

	{
		name: 'global-ignores',
		ignores: ['*', '!src/'],
	},
];
