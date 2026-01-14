/**
 * 命令状态管理
 *
 * 使用 Svelte 5 Runes 管理全局命令状态
 */

import type { CommandCategory } from '$lib/types/enums.js';

class CommandStore {
  /** 当前选中的命令分类 */
  selectedCategory = $state<CommandCategory>('bms' as CommandCategory);

  /** 搜索查询 */
  searchQuery = $state<string>('');

  /**
   * 设置选中的分类
   */
  setSelectedCategory(category: CommandCategory): void {
    this.selectedCategory = category;
  }

  /**
   * 设置搜索查询
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query;
  }

  /**
   * 清除搜索查询
   */
  clearSearchQuery(): void {
    this.searchQuery = '';
  }
}

export const commandStore = new CommandStore();
