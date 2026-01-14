<script lang="ts">
import { getCommandsByCategory } from '$lib/data/commandRegistry.js';
import type { CommandCategory } from '$lib/types/enums.js';
import CommandCard from '$lib/components/command/CommandCard.svelte';

interface Props {
  selectedCategory: CommandCategory;
}

let { selectedCategory }: Props = $props();

const commands = $derived.by(() => getCommandsByCategory(selectedCategory));
</script>

<div class="command-list-panel">
  <header class="panel-header">
    <h2 class="panel-title">命令列表</h2>
    <span class="command-count">{commands.length} 个命令</span>
  </header>

  {#if commands.length === 0}
    <p class="empty-message">该分类下暂无命令</p>
  {:else}
    <div class="command-grid">
      {#each commands as command (command.id)}
        <CommandCard {command} />
      {/each}
    </div>
  {/if}
</div>

<style>
.command-list-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.1);
}

.panel-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: rgb(255 255 255 / 0.9);
}

.command-count {
  font-size: 0.875rem;
  color: rgb(255 255 255 / 0.6);
}

.empty-message {
  text-align: center;
  color: rgb(255 255 255 / 0.4);
  padding: 2rem;
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
</style>
