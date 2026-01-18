/**
 * API 类型定义
 *
 * 定义了命令执行结果的通用类型
 */

/**
 * 通用命令结果
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}
