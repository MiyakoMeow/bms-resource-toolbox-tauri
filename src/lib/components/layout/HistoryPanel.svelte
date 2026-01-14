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

<aside class="history-panel">
  <div class="history-header">
    <h2 class="history-title">执行历史</h2>
    {#if executions.length > 0}
      <button class="btn-clear" onclick={clearHistory}>清除</button>
    {/if}
  </div>

  <div class="history-list">
    {#if executions.length === 0}
      <p class="empty-message">暂无执行记录</p>
    {:else}
      {#each executions.slice().reverse() as exec (exec.id)}
        <div class="history-item">
          <div class="item-header">
            <span class="item-name">{exec.commandName}</span>
            <span class="item-time">{formatTime(exec.timestamp)}</span>
          </div>

          <div class="item-meta">
            <span class="meta-badge {exec.success ? 'success' : 'error'}">
              {exec.success ? '✓ 成功' : '✗ 失败'}
            </span>
            <span class="meta-duration">{exec.duration}ms</span>
          </div>

          {#if exec.result}
            <details class="item-details">
              <summary>查看结果</summary>
              <ResultDisplay result={exec.result} />
            </details>
          {:else if exec.error}
            <p class="item-error">{exec.error}</p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</aside>

<style>
.history-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: rgb(255 255 255 / 0.9);
}

.btn-clear {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.8);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-clear:hover {
  background-color: rgb(255 255 255 / 0.15);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-message {
  text-align: center;
  color: rgb(255 255 255 / 0.4);
  padding: 2rem 0;
}

.history-item {
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.1);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.item-name {
  font-weight: 500;
  color: rgb(255 255 255 / 0.9);
}

.item-time {
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.5);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.meta-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}

.meta-badge.success {
  background-color: rgb(34 197 94 / 0.2);
  color: rgb(134 239 172);
}

.meta-badge.error {
  background-color: rgb(239 68 68 / 0.2);
  color: rgb(252 165 165);
}

.meta-duration {
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.5);
}

.item-details {
  margin-top: 0.5rem;
}

.item-details summary {
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.6);
  cursor: pointer;
  user-select: none;
}

.item-details summary:hover {
  color: rgb(255 255 255 / 0.8);
}

.item-error {
  font-size: 0.875rem;
  color: rgb(252 165 165);
  margin-top: 0.5rem;
}
</style>
