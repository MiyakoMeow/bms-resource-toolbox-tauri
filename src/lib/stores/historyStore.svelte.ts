/**
 * 历史记录状态管理
 *
 * 使用 Svelte 5 Runes 管理命令执行历史
 */

import type { CommandExecution } from '$lib/types/commands.js';

class HistoryStore {
  /** 执行历史列表 */
  executions = $state<CommandExecution[]>([]);

  /** 最大保留历史记录数量 */
  private readonly MAX_HISTORY = 100;

  /**
   * 添加执行记录
   */
  add(execution: CommandExecution): void {
    this.executions.push(execution);

    // 最多保留 MAX_HISTORY 条记录
    if (this.executions.length > this.MAX_HISTORY) {
      this.executions.shift();
    }
  }

  /**
   * 清空所有历史记录
   */
  clear(): void {
    this.executions = [];
  }

  /**
   * 删除指定的历史记录
   */
  remove(id: string): void {
    this.executions = this.executions.filter((e) => e.id !== id);
  }

  /**
   * 获取所有历史记录
   */
  getAll(): CommandExecution[] {
    return [...this.executions];
  }

  /**
   * 根据 ID 获取历史记录
   */
  getById(id: string): CommandExecution | undefined {
    return this.executions.find((e) => e.id === id);
  }

  /**
   * 获取成功的执行记录
   */
  getSuccessful(): CommandExecution[] {
    return this.executions.filter((e) => e.success);
  }

  /**
   * 获取失败的执行记录
   */
  getFailed(): CommandExecution[] {
    return this.executions.filter((e) => !e.success);
  }

  /**
   * 获取最近 N 条记录
   */
  getRecent(count: number): CommandExecution[] {
    return this.executions.slice(-count).reverse();
  }
}

export const historyStore = new HistoryStore();
