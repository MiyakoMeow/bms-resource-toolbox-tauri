/**
 * 进程执行器
 * 封装 Tauri Shell Command API，用于执行外部工具（ffmpeg、flac、oggenc 等）
 */

import { Command } from '@tauri-apps/plugin-shell';
import type { ProcessResult } from './types.js';

/**
 * 进程执行器类
 */
export class ProcessRunner {
  /**
   * 执行命令并返回结果
   *
   * @param program - 可执行文件名（如 'ffmpeg', 'flac'）
   * @param args - 命令行参数数组
   * @param options - 可选配置
   * @returns 执行结果
   */
  static async exec(
    program: string,
    args: string[],
    options?: { timeout?: number }
  ): Promise<ProcessResult> {
    try {
      const command = Command.create(program, args);

      // 设置超时（如果指定）
      if (options?.timeout) {
        // Tauri Shell Command 可能不支持直接的超时设置
        // 这里预留接口，实际超时控制可能需要其他方式实现
      }

      const result = await command.execute();

      return {
        success: result.code === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code,
      };
    } catch (error) {
      return {
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: null,
      };
    }
  }

  /**
   * 检查可执行文件是否存在
   *
   * @param program - 可执行文件名
   * @returns 是否存在
   */
  static async checkExecutable(program: string): Promise<boolean> {
    try {
      // 尝试使用 which 命令（Unix/Linux/macOS）
      const result = await Command.create('which', [program]).execute();
      if (result.code === 0) {
        return true;
      }
    } catch {
      // which 命令不存在或执行失败，尝试其他方法
    }

    try {
      // 尝试使用 where 命令（Windows）
      const result = await Command.create('where', [program]).execute();
      if (result.code === 0) {
        return true;
      }
    } catch {
      // where 命令不存在或执行失败
    }

    // 如果以上方法都失败，尝试直接执行命令（带 --version 或类似的参数）
    // 这是一种通用的检测方法
    const versionArgs: Record<string, string[]> = {
      ffmpeg: ['-version'],
      flac: ['--version'],
      oggenc: ['--version'],
      ffprobe: ['-version'],
    };

    const args = versionArgs[program];
    if (args) {
      try {
        await Command.create(program, args).execute();
        // 只要能执行（即使返回非零），说明命令存在
        return true;
      } catch {
        // 执行失败，可能命令不存在
        return false;
      }
    }

    return false;
  }
}
