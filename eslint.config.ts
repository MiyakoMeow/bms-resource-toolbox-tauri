import js from '@eslint/js';
import ts from 'typescript-eslint';
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
    ignores: [
      '.svelte-kit/',
      'build/',
      'dist/',
      'node_modules/',
      '.deno/',
      '*.config.js',
      'target/',
      'src-tauri/build/',
      'src-tauri/target/',
      'eslint-plugin-svelte-tailwind-canonical.ts',
    ],
  },

  // JavaScript/TypeScript 基础配置
  js.configs.recommended,

  // TypeScript + Svelte + Tailwind CSS 合并配置
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
      ts: ts as Plugin,
      'better-tailwindcss': betterTailwind,
      'tailwind-canonical-classes': tailwindCanonicalClasses,
      'svelte-tailwind-canonical': svelteTailwindCanonical,
    },
    rules: {
      // TypeScript 规则
      ...ts.configs.recommended.rules,

      // Tailwind CSS 规则
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'warn',
      'better-tailwindcss/no-unnecessary-whitespace': 'warn',
      'better-tailwindcss/no-unregistered-classes': 'warn',
      'tailwind-canonical-classes/tailwind-canonical-classes': [
        'warn',
        { cssPath: tailwindCssPath },
      ],
      'svelte-tailwind-canonical/tailwind-canonical-classes-svelte': [
        'warn',
        { cssPath: tailwindCssPath },
      ],
      // 避免与Prettier冲突
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: tailwindCssPath,
      },
    },
  },

  // CSS 文件配置（仅 Tailwind 检查，格式由 Prettier 处理）
  {
    files: ['**/*.css'],
    languageOptions: {
      parser: {
        // 空解析器：跳过语法检查，格式由 Prettier 负责
        parseForESLint: () =>
          ({
            ast: {
              type: 'Program',
              body: [],
              tokens: [],
              comments: [],
              loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
              range: [0, 0],
              sourceType: 'module',
            },
            scopeManager: null,
          }) as never,
      },
    },
    plugins: {
      'better-tailwindcss': betterTailwind,
    },
    rules: {
      'better-tailwindcss/no-unregistered-classes': 'warn',
      // 避免与Prettier冲突
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: tailwindCssPath,
      },
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
