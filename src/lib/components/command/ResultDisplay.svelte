<script lang="ts">
interface Props {
  result: unknown;
}

let { result }: Props = $props();

function formatResult(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

let formatted = $derived(formatResult(result));
let isObject = $derived(result !== null && typeof result === 'object' && !Array.isArray(result));
let isArray = $derived(Array.isArray(result));
</script>

<div class="flex flex-col gap-2">
  {#if typeof result === 'boolean'}
    <span class="font-medium {result ? 'text-green-400' : 'text-red-400'}">
      {result ? '✓ 是' : '✗ 否'}
    </span>
  {:else if typeof result === 'number'}
    <span class="font-mono text-orange-300">{result}</span>
  {:else if typeof result === 'string'}
    <span class="text-teal-300">{result}</span>
  {:else if isArray}
    <div class="flex flex-col gap-2">
      <span class="text-sm text-white/60">数组 ({(result as Array<unknown>).length} 项)</span>
      <pre
        class="m-0 overflow-x-auto rounded-lg bg-black/30 p-3 text-sm wrap-break-word whitespace-pre-wrap text-white/90">{formatted}</pre>
    </div>
  {:else if isObject}
    <div class="flex flex-col gap-2">
      <span class="text-sm text-white/60">对象</span>
      <pre
        class="m-0 overflow-x-auto rounded-lg bg-black/30 p-3 text-sm wrap-break-word whitespace-pre-wrap text-white/90">{formatted}</pre>
    </div>
  {:else}
    <span class="text-white/70">{formatted}</span>
  {/if}
</div>
