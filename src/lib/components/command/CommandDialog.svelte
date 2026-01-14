<script lang="ts">
import type { CommandDefinition } from '$lib/types/commands.js';
import ParameterInput from './ParameterInput.svelte';
import ResultDisplay from './ResultDisplay.svelte';
import { invokeCommand } from '$lib/utils/commandInvoker.js';
import { historyStore } from '$lib/stores/historyStore.svelte.js';
import { DANGEROUS_COMMANDS } from '$lib/data/dangerousCommands.js';

interface Props {
  command: CommandDefinition;
  show: boolean;
}

let { command, show = $bindable() }: Props = $props();

let params = $state<Record<string, unknown>>({});
let status = $state<'idle' | 'executing' | 'success' | 'error'>('idle');
let result = $state<unknown>(null);
let error = $state<string | null>(null);

// 设置默认值
$effect(() => {
  if (show) {
    const defaults: Record<string, unknown> = {};
    command.parameters.forEach((param) => {
      if (param.defaultValue !== undefined) {
        // 危险命令默认 dry_run = true
        if (param.name === 'dry_run' && DANGEROUS_COMMANDS.has(command.id)) {
          defaults[param.name] = true;
        } else {
          defaults[param.name] = param.defaultValue;
        }
      }
    });
    params = defaults;
    status = 'idle';
    result = null;
    error = null;
  }
});

async function execute() {
  status = 'executing';

  const startTime = performance.now();
  const execResult = await invokeCommand(command.id, params);
  const duration = performance.now() - startTime;

  if (execResult.success) {
    status = 'success';
    result = execResult.data;
  } else {
    status = 'error';
    error = execResult.error || '未知错误';
  }

  // 添加到历史记录
  historyStore.add({
    id: Date.now().toString(),
    commandId: command.id,
    commandName: command.name,
    timestamp: Date.now(),
    duration: Math.round(duration),
    success: execResult.success,
    result: result,
    error: error ?? undefined,
    params: { ...params },
  });
}

function close() {
  show = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close();
  }
}
</script>

{#if show}
  <div class="dialog-overlay" onclick={close} onkeydown={handleKeydown} role="presentation">
    <div
      class="dialog-content"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-label={command.name}
      tabindex="-1"
    >
      <!-- 头部 -->
      <div class="dialog-header">
        <h2 class="dialog-title">{command.name}</h2>
        <button class="close-btn" onclick={close}>✕</button>
      </div>

      <!-- 描述 -->
      <p class="dialog-description">{command.description}</p>

      {#if command.dangerous}
        <p class="dialog-warning">⚠️ 此操作会修改文件系统，请谨慎操作</p>
      {/if}

      <!-- 参数表单 -->
      <div class="dialog-body">
        {#each command.parameters as param}
          <ParameterInput
            bind:value={params[param.name]}
            {param}
            disabled={status === 'executing'}
          />
        {/each}
      </div>

      <!-- 结果展示 -->
      {#if status !== 'idle'}
        <div class="dialog-result">
          {#if status === 'executing'}
            <div class="loading">执行中...</div>
          {:else if status === 'success'}
            <ResultDisplay {result} />
            <p class="execution-time">
              执行耗时: {Number(historyStore.getById(Date.now().toString())?.duration || 0)}ms
            </p>
          {:else if status === 'error'}
            <div class="error-message">{error}</div>
          {/if}
        </div>
      {/if}

      <!-- 底部按钮 -->
      <div class="dialog-footer">
        <button class="btn-cancel" onclick={close}>取消</button>
        <button class="btn-execute" onclick={execute} disabled={status === 'executing'}>
          {status === 'executing' ? '执行中...' : '执行'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 0.5);
  backdrop-filter: blur(4px);
}

.dialog-content {
  width: 100%;
  max-width: 48rem;
  max-height: 80vh;
  overflow-y: auto;
  padding: 1.5rem;
  margin: 1rem;
  border-radius: 1rem;
  background-color: rgb(0 0 0 / 0.4);
  border: 1px solid rgb(255 255 255 / 0.2);
  backdrop-filter: blur(24px);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.dialog-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: rgb(255 255 255 / 0.9);
}

.close-btn {
  font-size: 1.5rem;
  color: rgb(255 255 255 / 0.6);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.close-btn:hover {
  color: rgb(255 255 255 / 0.9);
}

.dialog-description {
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.6);
  margin-bottom: 1rem;
}

.dialog-warning {
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  background-color: rgb(239 68 68 / 0.1);
  border: 1px solid rgb(239 68 68 / 0.3);
  color: rgb(252 165 165);
  font-size: 0.875rem;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.dialog-result {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.5rem;
  background-color: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.1);
}

.loading {
  text-align: center;
  color: rgb(255 255 255 / 0.6);
}

.execution-time {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.5);
}

.error-message {
  color: rgb(252 165 165);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-cancel,
.btn-execute {
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background-color: rgb(255 255 255 / 0.1);
  color: rgb(255 255 255 / 0.8);
  border: none;
}

.btn-cancel:hover {
  background-color: rgb(255 255 255 / 0.15);
}

.btn-execute {
  background-color: rgb(192 132 252 / 0.3);
  color: rgb(216 180 254);
  border: 1px solid rgb(192 132 252 / 0.3);
}

.btn-execute:hover:not(:disabled) {
  background-color: rgb(192 132 252 / 0.4);
}

.btn-execute:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
