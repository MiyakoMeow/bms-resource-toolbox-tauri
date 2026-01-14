<script lang="ts">
import CategorySidebar from '$lib/components/layout/CategorySidebar.svelte';
import CommandListPanel from '$lib/components/layout/CommandListPanel.svelte';
import HistoryPanel from '$lib/components/layout/HistoryPanel.svelte';
import { commandStore } from '$lib/stores/commandStore.svelte.js';
</script>

<div class="command-center">
  <!-- 左侧：分类导航 -->
  <aside class="sidebar-left">
    <CategorySidebar bind:selectedCategory={commandStore.selectedCategory} />
  </aside>

  <!-- 中间：命令列表 -->
  <main class="command-list">
    <CommandListPanel selectedCategory={commandStore.selectedCategory} />
  </main>

  <!-- 右侧：历史记录 -->
  <aside class="sidebar-right">
    <HistoryPanel />
  </aside>
</div>

<style>
.command-center {
  display: flex;
  height: 100%;
  gap: 1rem;
  padding: 1.5rem;
}

.sidebar-left {
  width: 16rem;
  flex-shrink: 0;
}

.command-list {
  flex: 1;
  overflow-y: auto;
}

.sidebar-right {
  width: 20rem;
  flex-shrink: 0;
}
</style>
