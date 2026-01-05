/**
 * ESLint Rule: Svelte Tailwind Canonical Classes
 *
 * This rule extends eslint-plugin-tailwind-canonical-classes for Svelte components.
 * It enforces canonical Tailwind CSS class names in Svelte class attributes.
 *
 * Note: This plugin is designed to work alongside eslint-plugin-tailwind-canonical-classes:
 * - eslint-plugin-tailwind-canonical-classes: handles HTML/JSX/TSX files
 * - eslint-plugin-svelte-tailwind-canonical: handles .svelte files (this plugin)
 *
 * Both plugins use the same underlying @tailwindcss/node API for canonicalization.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSyncFn, runAsWorker } from 'synckit';
import { __unstable__loadDesignSystem } from '@tailwindcss/node';

const designSystemCache = new Map<string, unknown>();

async function canonicalizeInWorker(
  cssContent: string,
  basePath: string,
  candidates: string[],
  options: Record<string, unknown> = {}
): Promise<string[]> {
  const cacheKey = basePath;
  let designSystem = designSystemCache.get(cacheKey);
  if (!designSystem) {
    designSystem = await __unstable__loadDesignSystem(cssContent, { base: basePath });
    designSystemCache.set(cacheKey, designSystem);
  }
  const ds = designSystem as {
    canonicalizeCandidates: (c: string[], o: Record<string, unknown>) => string[];
  };
  return ds.canonicalizeCandidates(candidates, options);
}

runAsWorker(canonicalizeInWorker);

function splitClasses(className: string): string[] {
  return className.trim().split(/\s+/).filter(Boolean);
}

function joinClasses(classes: string[]): string {
  return classes.join(' ');
}

function extractStaticClassValue(node: unknown): string | null {
  const n = node as { value?: unknown[] };
  if (!n.value || n.value.length !== 1) {
    return null;
  }
  const valueNode = n.value[0] as { type?: string; value?: unknown };
  if (
    (valueNode.type === 'SvelteLiteral' || valueNode.type === 'Literal') &&
    typeof valueNode.value === 'string'
  ) {
    return valueNode.value;
  }
  return null;
}

const workerPath = fileURLToPath(import.meta.url);
const canonicalizeSync = createSyncFn(workerPath);

function canonicalizeClasses(
  cssPath: string,
  candidates: string[],
  rootFontSize = 16
): string[] | null {
  if (!fs.existsSync(cssPath)) {
    return null;
  }
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const basePath = path.dirname(cssPath);
  return canonicalizeSync(cssContent, basePath, candidates, { rem: rootFontSize });
}

const rule = {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description:
        'Enforce canonical Tailwind CSS class names in Svelte class attributes. ' +
        'This is the Svelte-specific version of eslint-plugin-tailwind-canonical-classes.',
      recommended: false,
    },
    fixable: 'code' as const,
    messages: {
      nonCanonical: "Class '{{original}}' should be '{{canonical}}'",
      cssNotFound: 'Could not load Tailwind CSS file: {{path}}',
    },
    schema: [
      {
        type: 'object',
        properties: {
          cssPath: {
            type: 'string',
          },
          rootFontSize: {
            type: 'number',
          },
        },
        // 移除 required，使所有选项可选，支持默认配置
        additionalProperties: false,
      },
    ],
  },
  create(context: unknown) {
    const ctx = context as {
      options: unknown[];
      getCwd?: () => string;
      getSourceCode: () => { ast: unknown; text: string };
      report: (input: {
        node: unknown;
        messageId: string;
        data?: Record<string, unknown>;
        fix?: unknown;
      }) => void;
    };
    // 添加默认配置支持
    const options = (ctx.options?.[0] ?? {}) as { cssPath?: string; rootFontSize?: number };
    const cssPathInput = options.cssPath ?? './src/main.css'; // 默认值
    const rootFontSize = options.rootFontSize ?? 16;

    // 解析 CSS 文件路径
    // 使用 context.getCwd() 而不是 process.cwd()，确保路径解析基于项目根目录
    const cwd = ctx.getCwd ? ctx.getCwd() : process.cwd();
    let cssPath: string;
    if (path.isAbsolute(cssPathInput)) {
      cssPath = path.normalize(cssPathInput);
    } else {
      cssPath = path.normalize(path.resolve(cwd, cssPathInput));
    }
    if (!fs.existsSync(cssPath)) {
      ctx.report({
        node: ctx.getSourceCode().ast,
        messageId: 'cssNotFound',
        data: {
          path: cssPath,
        },
      });
      return {};
    }
    return {
      SvelteAttribute(node: unknown) {
        const n = node as { key?: { name?: string }; range?: [number, number] };
        if (!n.key || n.key.name !== 'class') {
          return;
        }
        const staticValue = extractStaticClassValue(node);
        if (staticValue === null) {
          return;
        }
        const classes = splitClasses(staticValue);
        if (classes.length === 0) {
          return;
        }
        const sourceCode = ctx.getSourceCode();
        const sourceText = sourceCode.text;
        const errors: Array<{ original: string; canonical: string; index: number }> = [];
        let canonicalized: string[] | null;
        try {
          canonicalized = canonicalizeClasses(cssPath, classes, rootFontSize);
        } catch {
          return;
        }
        if (canonicalized === null) {
          ctx.report({
            node,
            messageId: 'cssNotFound',
            data: {
              path: cssPath,
            },
          });
          return;
        }
        classes.forEach((className, index) => {
          const canonical = canonicalized![index];
          if (canonical && canonical !== className) {
            errors.push({
              original: className,
              canonical,
              index,
            });
          }
        });
        if (errors.length === 0 || !Array.isArray(n.range)) {
          return;
        }
        const fullRangeStart = n.range[0];
        const fullRangeEnd = n.range[1];
        const fullText = sourceText.slice(fullRangeStart, fullRangeEnd);
        const doubleQuoteIndex = fullText.indexOf('"');
        const singleQuoteIndex = fullText.indexOf("'");
        let quoteIndex = -1;
        let quoteChar = '"';
        if (doubleQuoteIndex === -1 && singleQuoteIndex === -1) {
          return;
        } else if (doubleQuoteIndex === -1) {
          quoteIndex = singleQuoteIndex;
          quoteChar = "'";
        } else if (singleQuoteIndex === -1 || doubleQuoteIndex < singleQuoteIndex) {
          quoteIndex = doubleQuoteIndex;
          quoteChar = '"';
        } else {
          quoteIndex = singleQuoteIndex;
          quoteChar = "'";
        }
        const lastQuoteIndex = fullText.lastIndexOf(quoteChar);
        if (lastQuoteIndex <= quoteIndex) {
          return;
        }
        const fixedClasses = [...classes];
        errors.forEach((error) => {
          fixedClasses[error.index] = error.canonical;
        });
        const fixedValue = joinClasses(fixedClasses);
        const before = fullText.slice(0, quoteIndex + 1);
        const after = fullText.slice(lastQuoteIndex);
        const fixedAttrText = before + fixedValue + after;
        errors.forEach((error, errorIndex) => {
          ctx.report({
            node,
            messageId: 'nonCanonical',
            data: {
              original: error.original,
              canonical: error.canonical,
            },
            fix:
              errorIndex === 0
                ? (fixer: { replaceTextRange: (r: [number, number], t: string) => unknown }) =>
                    fixer.replaceTextRange([fullRangeStart, fullRangeEnd], fixedAttrText)
                : undefined,
          });
        });
      },
    };
  },
};

/**
 * 导出标准 ESLint Plugin 对象
 *
 * @example
 * ```typescript
 * import svelteTailwindCanonical from './eslint-plugin-svelte-tailwind-canonical.ts';
 *
 * {
 *   plugins: {
 *     'svelte-tailwind-canonical': svelteTailwindCanonical,
 *   },
 *   rules: {
 *     // 使用默认配置（cssPath: './src/main.css'）
 *     'svelte-tailwind-canonical/tailwind-canonical-classes-svelte': 'warn',
 *   },
 * }
 * ```
 */
const plugin = {
  rules: {
    'tailwind-canonical-classes-svelte': rule,
  },
};

export default plugin;
