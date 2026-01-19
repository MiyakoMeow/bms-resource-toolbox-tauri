<script lang="ts">
import CategorySidebar from '$lib/components/layout/CategorySidebar.svelte';
import CommandListPanel from '$lib/components/layout/CommandListPanel.svelte';
import HistoryPanel from '$lib/components/layout/HistoryPanel.svelte';
import { commandStore } from '$lib/stores/commandStore.svelte.js';
</script>

<div class="flex h-full gap-4 p-6">
  <!-- 左侧：分类导航 -->
  <aside class="h-full w-64 shrink-0 overflow-hidden">
    <CategorySidebar bind:selectedCategory={commandStore.selectedCategory} />
  </aside>

  <!-- 中间：命令列表 -->
  <main class="flex-1 overflow-y-auto">
    <CommandListPanel selectedCategory={commandStore.selectedCategory} />
  </main>

  <!-- 右侧：历史记录 -->
  <aside class="h-full w-80 shrink-0 overflow-hidden">
    <HistoryPanel />
  </aside>
</div>
