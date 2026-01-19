/**
 * 独立进度管理系统
 * 支持暂停/恢复/取消，保持中间状态
 */

/**
 * 进度事件
 */
export interface ProgressEvent {
  /** 当前进度 */
  current: number;
  /** 总进度 */
  total: number;
  /** 进度百分比 (0-100) */
  percentage: number;
  /** 状态消息 */
  message: string;
  /** 是否暂停 */
  paused: boolean;
  /** 是否已取消 */
  cancelled: boolean;
  /** 是否完成 */
  completed: boolean;
  /** 错误信息（如果有） */
  error?: string;
}

/**
 * 进度回调函数
 */
export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * 进度管理器接口
 */
export interface IProgressManager {
  /** 启动任务 */
  start(): void;

  /** 暂停任务 */
  pause(): void;

  /** 恢复任务 */
  resume(): void;

  /** 取消任务 */
  cancel(): void;

  /** 更新进度 */
  update(current: number, total: number, message?: string): void;

  /** 增加进度 */
  increment(delta: number, message?: string): void;

  /** 设置消息 */
  setMessage(message: string): void;

  /** 报告错误 */
  reportError(error: string): void;

  /** 获取当前进度事件 */
  getProgress(): ProgressEvent;

  /** 订阅进度更新 */
  onProgress(callback: ProgressCallback): () => void;

  /** 检查是否已取消或暂停 */
  shouldStop(): boolean;

  /** 等待恢复（如果暂停中） */
  waitForResume(): Promise<void>;
}

/**
 * 进度管理器实现
 */
export class ProgressManager implements IProgressManager {
  private current: number = 0;
  private total: number = 0;
  private message: string = '准备中...';
  private paused: boolean = false;
  private cancelled: boolean = false;
  private completed: boolean = false;
  private started: boolean = false;
  private error?: string;
  private callbacks: Set<ProgressCallback> = new Set();

  /**
   * 启动任务
   */
  start(): void {
    this.started = true;
    this.paused = false;
    this.cancelled = false;
    this.completed = false;
    this.current = 0;
    this.error = undefined;
    this.message = '开始处理...';
    this.notify();
  }

  /**
   * 暂停任务
   */
  pause(): void {
    if (!this.started || this.completed || this.cancelled) {
      return;
    }
    this.paused = true;
    this.message = '已暂停';
    this.notify();
  }

  /**
   * 恢复任务
   */
  resume(): void {
    if (!this.started || this.completed || this.cancelled) {
      return;
    }
    this.paused = false;
    this.message = '继续处理...';
    this.notify();
  }

  /**
   * 取消任务
   */
  cancel(): void {
    if (!this.started || this.completed) {
      return;
    }
    this.cancelled = true;
    this.paused = false;
    this.message = '已取消';
    this.notify();
  }

  /**
   * 更新进度
   */
  update(current: number, total: number, message?: string): void {
    this.current = Math.max(0, current);
    this.total = Math.max(1, total);

    if (message) {
      this.message = message;
    }

    // 检查是否完成
    if (this.current >= this.total) {
      this.completed = true;
      this.message = message || '处理完成';
    }

    this.notify();
  }

  /**
   * 增加进度
   */
  increment(delta: number, message?: string): void {
    this.update(this.current + delta, this.total, message);
  }

  /**
   * 设置消息
   */
  setMessage(message: string): void {
    this.message = message;
    this.notify();
  }

  /**
   * 报告错误
   */
  reportError(error: string): void {
    this.error = error;
    this.message = `错误: ${error}`;
    this.notify();
  }

  /**
   * 获取当前进度事件
   */
  getProgress(): ProgressEvent {
    const percentage = Math.min(100, Math.round((this.current / Math.max(1, this.total)) * 100));

    return {
      current: this.current,
      total: this.total,
      percentage,
      message: this.message,
      paused: this.paused,
      cancelled: this.cancelled,
      completed: this.completed,
      error: this.error,
    };
  }

  /**
   * 订阅进度更新
   * 返回取消订阅的函数
   */
  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);

    // 立即发送当前进度
    callback(this.getProgress());

    // 返回取消订阅的函数
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * 检查是否应该停止（暂停或取消）
   */
  shouldStop(): boolean {
    return this.paused || this.cancelled || this.completed;
  }

  /**
   * 等待恢复（如果暂停中）
   */
  async waitForResume(): Promise<void> {
    while (this.paused && !this.cancelled && !this.completed) {
      // 每 100ms 检查一次状态
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * 通知所有订阅者
   */
  private notify(): void {
    const event = this.getProgress();
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    }
  }
}

/**
 * 进度管理器工厂
 */
export class ProgressManagerFactory {
  private static instances: Map<string, IProgressManager> = new Map();

  /**
   * 创建或获取进度管理器
   */
  static create(id: string): IProgressManager {
    if (this.instances.has(id)) {
      return this.instances.get(id)!;
    }

    const manager = new ProgressManager();
    this.instances.set(id, manager);
    return manager;
  }

  /**
   * 获取进度管理器
   */
  static get(id: string): IProgressManager | undefined {
    return this.instances.get(id);
  }

  /**
   * 销毁进度管理器
   */
  static destroy(id: string): void {
    this.instances.delete(id);
  }

  /**
   * 销毁所有进度管理器
   */
  static destroyAll(): void {
    this.instances.clear();
  }

  /**
   * 获取所有进度管理器 ID
   */
  static getAllIds(): string[] {
    return Array.from(this.instances.keys());
  }
}
