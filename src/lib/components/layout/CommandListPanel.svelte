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

<div class="flex h-full flex-col gap-4 overflow-y-auto">
  <header class="flex items-center justify-between border-b border-white/10 pb-4">
    <h2 class="text-2xl font-bold text-white/90">命令列表</h2>
    <span class="text-sm text-white/60">{commands.length} 个命令</span>
  </header>

  {#if commands.length === 0}
    <p class="py-8 text-center text-white/40">该分类下暂无命令</p>
  {:else}
    <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {#each commands as command (command.id)}
        <CommandCard {command} />
      {/each}
    </div>
  {/if}
</div>
