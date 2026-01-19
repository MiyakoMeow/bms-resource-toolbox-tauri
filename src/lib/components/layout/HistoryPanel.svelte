<script lang="ts">
import { historyStore } from '$lib/stores/historyStore.svelte.js';
import ResultDisplay from '$lib/components/command/ResultDisplay.svelte';

let executions = $derived(historyStore.executions);

function clearHistory() {
  historyStore.clear();
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN');
}
</script>

<aside class="flex h-full flex-col gap-4 overflow-hidden">
  <div class="flex items-center justify-between">
    <h2 class="text-xl font-bold text-white/90">执行历史</h2>
    {#if executions.length > 0}
      <button
        class="cursor-pointer rounded-lg border-none bg-white/10 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/15"
        onclick={clearHistory}
      >
        清除
      </button>
    {/if}
  </div>

  <div class="flex flex-1 flex-col gap-3 overflow-y-auto">
    {#if executions.length === 0}
      <p class="py-8 text-center text-white/40">暂无执行记录</p>
    {:else}
      {#each executions.slice().reverse() as exec (exec.id)}
        <div class="rounded-lg border border-white/10 bg-white/5 p-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-medium text-white/90">{exec.commandName}</span>
            <span class="text-xs text-white/50">{formatTime(exec.timestamp)}</span>
          </div>

          <div class="mb-2 flex items-center gap-2">
            <span
              class="rounded-sm px-2 py-1 text-xs {exec.success
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'}"
            >
              {exec.success ? '✓ 成功' : '✗ 失败'}
            </span>
            <span class="text-xs text-white/50">{exec.duration}ms</span>
          </div>

          {#if exec.result}
            <details class="mt-2">
              <summary class="cursor-pointer text-sm text-white/60 select-none hover:text-white/80">
                查看结果
              </summary>
              <ResultDisplay result={exec.result} />
            </details>
          {:else if exec.error}
            <p class="mt-2 text-sm text-red-400">{exec.error}</p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>
