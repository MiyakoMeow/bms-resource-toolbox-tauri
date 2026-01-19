/**
 * 并发控制池
 * 用于控制并发任务数量，替代 Rust 的 futures::stream::buffer_unordered(64)
 */

/**
 * 并发控制池类
 * 限制同时运行的任务数量，超过限制时等待其他任务完成
 */
export class ConcurrencyPool<T> {
  private concurrency: number;
  private running: Set<Promise<T>>;

  /**
   * 创建并发控制池
   *
   * @param concurrency - 最大并发数（默认 64，与 Rust 代码一致）
   */
  constructor(concurrency: number = 64) {
    this.concurrency = concurrency;
    this.running = new Set();
  }

  /**
   * 添加任务到池中并执行
   * 如果已达到并发限制，会等待其他任务完成后再执行
   *
   * @param task - 要执行的任务函数
   * @returns 任务执行结果
   */
  async add(task: () => Promise<T>): Promise<T> {
    // 如果已达到并发限制，等待其他任务完成
    while (this.running.size >= this.concurrency) {
      const done = Promise.race(this.running);
      await done.catch(() => {});
    }

    // 创建任务并添加到运行集合
    const promise = task();
    this.running.add(promise);

    try {
      // 等待任务完成并返回结果
      return await promise;
    } finally {
      // 任务完成后从运行集合中移除
      this.running.delete(promise);
    }
  }

  /**
   * 等待所有正在运行的任务完成
   */
  async drain(): Promise<void> {
    // 持续等待直到没有正在运行的任务
    while (this.running.size > 0) {
      const done = Promise.race(this.running);
      await done.catch(() => {});
    }
  }

  /**
   * 获取当前正在运行的任务数量
   */
  get runningCount(): number {
    return this.running.size;
  }
}
