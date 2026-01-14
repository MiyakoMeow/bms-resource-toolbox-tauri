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

<nav class="category-nav">
  <h2 class="nav-title">命令分类</h2>

  <div class="category-list">
    {#each Object.values(CATEGORY_METADATA) as category (category.id)}
      <button
        class="category-item"
        class:selected={selectedCategory === category.id}
        onclick={() => selectCategory(category.id)}
        aria-label={category.name}
        aria-pressed={selectedCategory === category.id}
        type="button"
      >
        <span class="category-icon">{category.icon}</span>
        <div class="category-info">
          <span class="category-name">{category.name}</span>
          <span class="category-desc">{category.description}</span>
        </div>
      </button>
    {/each}
  </div>
</nav>

<style>
.category-nav {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nav-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: rgb(255 255 255 / 0.9);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background-color: rgb(255 255 255 / 0.1);
  border-color: rgb(255 255 255 / 0.2);
}

.category-item.selected {
  background-color: rgb(255 255 255 / 0.15);
  border-color: rgb(255 255 255 / 0.3);
  box-shadow: 0 10px 15px -3px rgb(168 85 247 / 0.1);
}

.category-icon {
  font-size: 2rem;
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-name {
  font-weight: 500;
  color: rgb(255 255 255 / 0.9);
}

.category-desc {
  font-size: 0.75rem;
  color: rgb(255 255 255 / 0.6);
}
</style>
