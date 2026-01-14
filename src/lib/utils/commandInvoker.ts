/**
 * Tauri 命令调用工具
 *
 * 封装 Tauri invoke 调用，提供统一的错误处理和类型安全
 */

import { invoke } from '@tauri-apps/api/core';
import type { CommandResult } from '$lib/types/api.js';

/**
 * 调用 Tauri 命令
 *
 * @param commandName - 命令名称（对应 Rust 中的命令名）
 * @param params - 命令参数
 * @returns 命令执行结果
 */
export async function invokeCommand<T = unknown>(
  commandName: string,
  params?: Record<string, unknown>
): Promise<CommandResult<T>> {
  const startTime = performance.now();

  try {
    const data = await invoke<T>(commandName, params || {});
    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data,
      executionTime: Math.round(executionTime),
    };
  } catch (error) {
    const executionTime = performance.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Math.round(executionTime),
    };
  }
}

/**
 * 调用 Tauri 命令（带重试）
 *
 * @param commandName - 命令名称
 * @param params - 命令参数
 * @param maxRetries - 最大重试次数（默认 1）
 * @param retryDelay - 重试延迟（毫秒，默认 1000）
 * @returns 命令执行结果
 */
export async function invokeCommandWithRetry<T = unknown>(
  commandName: string,
  params?: Record<string, unknown>,
  maxRetries = 1,
  retryDelay = 1000
): Promise<CommandResult<T>> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    const result = await invokeCommand<T>(commandName, params);

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // 如果还有重试机会，等待后重试
    if (i < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return {
    success: false,
    error: lastError || '未知错误',
  };
}

/**
 * 批量调用 Tauri 命令
 *
 * @param commands - 命令列表 [{ name, params }]
 * @returns 命令执行结果列表
 */
export async function invokeBatchCommands<T = unknown>(
  commands: Array<{
    name: string;
    params?: Record<string, unknown>;
  }>
): Promise<CommandResult<T>[]> {
  return Promise.all(commands.map((cmd) => invokeCommand<T>(cmd.name, cmd.params)));
}
