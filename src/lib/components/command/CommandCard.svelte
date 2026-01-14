<script lang="ts">
import type { CommandDefinition } from '$lib/types/commands.js';
import CommandDialog from './CommandDialog.svelte';

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
  class="command-card"
  onclick={openDialog}
  onkeydown={handleKeydown}
  role="button"
  tabindex="0"
  aria-label={command.name}
>
  <div class="card-header">
    <h3 class="card-title">{command.name}</h3>
    {#if command.dangerous}
      <span class="danger-badge">⚠️ 危险</span>
    {/if}
  </div>

  <p class="card-desc">{command.description}</p>

  <div class="card-footer">
    <span class="param-count">{command.parameters.length} 个参数</span>
    <button class="execute-btn">执行</button>
  </div>
</div>

{#if showDialog}
  <CommandDialog {command} bind:show={showDialog} />
{/if}

<style>
.command-card {
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.1);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.command-card:hover {
  background-color: rgb(255 255 255 / 0.1);
  border-color: rgb(255 255 255 / 0.2);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.card-title {
  font-weight: 600;
  color: rgb(255 255 255 / 0.9);
  margin: 0;
}

.danger-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: rgb(239 68 68 / 0.2);
  color: rgb(252 165 165);
  border: 1px solid rgb(239 68 68 / 0.3);
}

.card-desc {
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.6);
  margin: 0;
  flex: 1;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.param-count {
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.4);
}

.execute-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: rgb(192 132 252 / 0.2);
  color: rgb(216 180 254);
  border: 1px solid rgb(192 132 252 / 0.3);
  cursor: pointer;
  transition: background-color 0.2s;
}

.execute-btn:hover {
  background-color: rgb(192 132 252 / 0.3);
}
</style>
