import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import type { Linter } from 'eslint';
import type { Plugin, RulesConfig } from '@eslint/core';
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes';
import svelteTailwindCanonicalRule from './eslint-plugin-svelte-tailwind-canonical.ts';

const tailwindCanonicalPlugins = { 'tailwind-canonical-classes': tailwindCanonicalClasses };
const svelteTailwindCanonicalPlugins: Record<string, Plugin> = {
  'svelte-tailwind-canonical': {
    rules: {
      'tailwind-canonical-classes-svelte': svelteTailwindCanonicalRule,
    },
  },
};
const tailwindCanonicalRules: RulesConfig = {
  'tailwind-canonical-classes/tailwind-canonical-classes': ['warn', { cssPath: './src/main.css' }],
};
const svelteTailwindCanonicalRules: RulesConfig = {
  'svelte-tailwind-canonical/tailwind-canonical-classes-svelte': [
    'warn',
    { cssPath: './src/main.css' },
  ],
};

const config: Linter.Config[] = [
  // 忽略常见的构建和依赖目录
  {
    ignores: ['.svelte-kit/', 'build/', 'dist/', 'node_modules/', '.deno/', '*.config.js'],
  },

  // JavaScript/TypeScript 基础配置
  js.configs.recommended,

  // Better Tailwind CSS 配置
  {
    files: ['**/*.svelte', '**/*.ts', '**/*.tsx'],
    plugins: {
      'better-tailwindcss': betterTailwind,
      ...tailwindCanonicalPlugins,
      ...svelteTailwindCanonicalPlugins,
    },
    rules: {
      'better-tailwindcss/enforce-consistent-class-order': 'warn',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'warn',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'warn',
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unregistered-classes': 'warn',
      ...tailwindCanonicalRules,
      ...svelteTailwindCanonicalRules,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: './src/main.css',
      },
    },
  },

  // TypeScript 配置
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.svelte'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': ts as Plugin,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', disallowTypeAnnotations: false },
      ],
    },
  },

  // Svelte 配置
  ...svelte.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      'svelte/no-at-html-tags': 'error',
    },
  },

  // Prettier 配置（必须放在最后以覆盖其他规则）
  prettier,
];

export default config;
