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

<div class="result-display">
  {#if typeof result === 'boolean'}
    <span class="result-boolean {result ? 'true' : 'false'}">
      {result ? '✓ 是' : '✗ 否'}
    </span>
  {:else if typeof result === 'number'}
    <span class="result-number">{result}</span>
  {:else if typeof result === 'string'}
    <span class="result-string">{result}</span>
  {:else if isArray}
    <div class="result-array">
      <span class="result-label">数组 ({(result as Array<unknown>).length} 项)</span>
      <pre class="result-json">{formatted}</pre>
    </div>
  {:else if isObject}
    <div class="result-object">
      <span class="result-label">对象</span>
      <pre class="result-json">{formatted}</pre>
    </div>
  {:else}
    <span class="result-other">{formatted}</span>
  {/if}
</div>

<style>
.result-display {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-boolean {
  font-weight: 500;
}

.result-boolean.true {
  color: rgb(134 239 172);
}

.result-boolean.false {
  color: rgb(252 165 165);
}

.result-number {
  color: rgb(253 186 116);
  font-family: monospace;
}

.result-string {
  color: rgb(167 243 208);
}

.result-array,
.result-object {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-label {
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.6);
}

.result-json {
  margin: 0;
  padding: 0.75rem;
  background-color: rgb(0 0 0 / 0.3);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.9);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.result-other {
  color: rgb(255 255 255 / 0.7);
}
</style>
