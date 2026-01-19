<script lang="ts">
import { CATEGORY_METADATA } from '$lib/data/commandRegistry.js';
import type { CommandCategory } from '$lib/types/enums.js';

interface Props {
  selectedCategory: CommandCategory;
}

let { selectedCategory = $bindable() }: Props = $props();

function selectCategory(category: CommandCategory) {
  selectedCategory = category;
}
</script>

<nav class="flex h-full flex-col gap-4 overflow-y-auto">
  <h2 class="text-xl font-bold text-white/90">命令分类</h2>

  <div class="flex flex-col gap-2">
    {#each Object.values(CATEGORY_METADATA) as category (category.id)}
      <button
        class="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 transition-all hover:border-white/20 hover:bg-white/10 {selectedCategory ===
        category.id
          ? 'border-white/30 bg-white/15 shadow-[0_10px_15px_-3px_rgba(168,85,247,0.1)]'
          : ''}"
        onclick={() => selectCategory(category.id)}
        aria-label={category.name}
        aria-pressed={selectedCategory === category.id}
        type="button"
      >
        <span class="text-2xl">{category.icon}</span>
        <div class="flex flex-col">
          <span class="font-medium text-white/90">{category.name}</span>
          <span class="text-xs text-white/60">{category.description}</span>
        </div>
      </button>
    {/each}
  </div>
</nav>
