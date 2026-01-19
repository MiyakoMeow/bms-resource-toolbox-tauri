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
        // 危险命令默认 dryRun = true
        if (param.key === 'dryRun' && DANGEROUS_COMMANDS.has(command.id)) {
          defaults[param.key] = true;
        } else {
          defaults[param.key] = param.defaultValue;
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
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onclick={close}
    onkeydown={handleKeydown}
    role="presentation"
  >
    <div
      class="m-4 max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/20 bg-black/40 p-6 shadow-2xl backdrop-blur-xl"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeydown}
      role="dialog"
      aria-modal="true"
      aria-label={command.name}
      tabindex="-1"
    >
      <!-- 头部 -->
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-white/90">{command.name}</h2>
        <button
          class="cursor-pointer border-none bg-transparent p-1 text-2xl leading-none text-white/60 hover:text-white/90"
          onclick={close}
        >
          ✕
        </button>
      </div>

      <!-- 描述 -->
      <p class="mb-4 text-sm text-white/60">{command.description}</p>

      {#if command.dangerous}
        <p class="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          ⚠️ 此操作会修改文件系统，请谨慎操作
        </p>
      {/if}

      <!-- 参数表单 -->
      <div class="mb-6 flex flex-col gap-4">
        {#each command.parameters as param}
          <ParameterInput
            bind:value={params[param.key]}
            {param}
            disabled={status === 'executing'}
          />
        {/each}
      </div>

      <!-- 结果展示 -->
      {#if status !== 'idle'}
        <div class="mb-6 rounded-lg border border-white/10 bg-white/5 p-4">
          {#if status === 'executing'}
            <div class="text-center text-white/60">执行中...</div>
          {:else if status === 'success'}
            <ResultDisplay {result} />
            <p class="mt-2 text-xs text-white/50">
              执行耗时:
              {Number(historyStore.getById(Date.now().toString())?.duration || 0)}ms
            </p>
          {:else if status === 'error'}
            <div class="text-red-400">{error}</div>
          {/if}
        </div>
      {/if}

      <!-- 底部按钮 -->
      <div class="flex justify-end gap-3">
        <button
          class="cursor-pointer rounded-lg border-none bg-white/10 px-6 py-2 font-medium text-white/80 transition-all hover:bg-white/15"
          onclick={close}
        >
          取消
        </button>
        <button
          class="cursor-pointer rounded-lg border border-purple-500/30 bg-purple-500/30 px-6 py-2 font-medium text-purple-400 transition-all hover:bg-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={execute}
          disabled={status === 'executing'}
        >
          {status === 'executing' ? '执行中...' : '执行'}
        </button>
      </div>
    </div>
  </div>
{/if}
