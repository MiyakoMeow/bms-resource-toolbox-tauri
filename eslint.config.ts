import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import betterTailwind from 'eslint-plugin-better-tailwindcss';
import type { Linter } from 'eslint';
import type { Plugin } from '@eslint/core';
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes';
import svelteTailwindCanonical from './eslint-plugin-svelte-tailwind-canonical.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 获取项目根目录（配置文件所在目录）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;

// Tailwind CSS 文件路径（相对于项目根目录）
const tailwindCssPath = path.join(projectRoot, 'src', 'main.css');

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
      'tailwind-canonical-classes': tailwindCanonicalClasses,
      'svelte-tailwind-canonical': svelteTailwindCanonical,
    },
    rules: {
      'better-tailwindcss/enforce-consistent-class-order': 'warn',
      'better-tailwindcss/enforce-consistent-line-wrapping': 'warn',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'warn',
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unregistered-classes': 'warn',
      // 使用绝对路径
      'tailwind-canonical-classes/tailwind-canonical-classes': ['warn', { cssPath: tailwindCssPath }],
      // 自定义插件也使用绝对路径（而不是默认配置）
      'svelte-tailwind-canonical/tailwind-canonical-classes-svelte': ['warn', { cssPath: tailwindCssPath }],
    },
    settings: {
      'better-tailwindcss': {
        // 使用绝对路径
        entryPoint: tailwindCssPath,
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
