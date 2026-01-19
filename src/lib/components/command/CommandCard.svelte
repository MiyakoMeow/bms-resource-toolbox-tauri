<script lang="ts">
import type { CommandDefinition } from '$lib/types/commands.js';
import CommandDialog from './CommandDialog.svelte';
import { formatParameterTypes } from '$lib/utils/commandParameters.js';

interface Props {
  command: CommandDefinition;
}

let { command }: Props = $props();

let showDialog = $state(false);

function openDialog() {
  showDialog = true;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openDialog();
  }
}
</script>

<div
  class="flex cursor-pointer flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
  onclick={openDialog}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label={command.name}
>
  <div class="flex items-center justify-between gap-2">
    <h3 class="m-0 font-semibold text-white/90">{command.name}</h3>
    {#if command.dangerous}
      <span class="rounded-sm border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs text-red-400"
        >⚠️ 危险</span
      >
    {/if}
  </div>

  <p class="m-0 flex-1 text-sm text-white/60">{command.description}</p>

  <div class="mt-auto flex items-center justify-between">
    <span class="max-w-[70%] truncate text-xs text-white/50" title={formatParameterTypes(command)}
      >{formatParameterTypes(command)}</span
    >
    <button
      class="cursor-pointer rounded-lg border border-purple-500/30 bg-purple-500/20 px-4 py-2 text-purple-400 transition-colors hover:bg-purple-500/30"
    >
      执行
    </button>
  </div>
</div>

{#if showDialog}
  <CommandDialog {command} bind:show={showDialog} />
{/if}
