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
      description: 'Enforce canonical Tailwind CSS class names in Svelte class attributes',
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
        required: ['cssPath'],
        additionalProperties: false,
      },
    ],
  },
  create(context: unknown) {
    const ctx = context as {
      options: unknown[];
      getSourceCode: () => { ast: unknown; text: string };
      report: (input: {
        node: unknown;
        messageId: string;
        data?: Record<string, unknown>;
        fix?: unknown;
      }) => void;
    };
    const options = (ctx.options?.[0] ?? {}) as { cssPath?: string; rootFontSize?: number };
    if (!options || !options.cssPath) {
      ctx.report({
        node: ctx.getSourceCode().ast,
        messageId: 'cssNotFound',
        data: {
          path: 'not specified',
        },
      });
      return {};
    }
    let cssPath: string;
    if (path.isAbsolute(options.cssPath)) {
      cssPath = path.normalize(options.cssPath);
    } else {
      cssPath = path.normalize(path.resolve(process.cwd(), options.cssPath));
    }
    const rootFontSize = options.rootFontSize ?? 16;
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

export default rule;
