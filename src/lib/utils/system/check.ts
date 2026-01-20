/**
 * 可执行文件检查模块
 * 从 Python 代码迁移：legacy/options/__init__.py
 *
 * 提供系统可执行文件检查功能：
 * - check_ffmpeg_exec: 检查 ffmpeg 是否可用
 * - check_flac_exec: 检查 flac 是否可用
 * - check_oggenc_exec: 检查 oggenc 是否可用
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * 检查结果
 */
export interface CheckResult {
  success: boolean;
  executable: string;
  message: string;
}

/**
 * 检查 ffmpeg 是否可用
 * 对应 Python: check_ffmpeg_exec (legacy/options/__init__.py:247-248)
 *
 * @command
 * @category system
 * @dangerous false
 * @name 检查 ffmpeg
 * @description 检查系统是否安装了 ffmpeg
 * @frontend true
 *
 * @returns {Promise<CheckResult>} 检查结果
 */
export async function checkFfmpegExec(): Promise<CheckResult> {
  return checkExecutable('ffmpeg', '-version', 'ffmpeg');
}

/**
 * 检查 flac 是否可用
 * 对应 Python: check_flac_exec (legacy/options/__init__.py:251-252)
 *
 * @command
 * @category system
 * @dangerous false
 * @name 检查 flac
 * @description 检查系统是否安装了 flac
 * @frontend true
 *
 * @returns {Promise<CheckResult>} 检查结果
 */
export async function checkFlacExec(): Promise<CheckResult> {
  return checkExecutable('flac', '--version', 'flac');
}

/**
 * 检查 oggenc 是否可用
 * 对应 Python: check_oggenc_exec (legacy/options/__init__.py:255-256)
 *
 * @command
 * @category system
 * @dangerous false
 * @name 检查 oggenc
 * @description 检查系统是否安装了 oggenc
 * @frontend true
 *
 * @returns {Promise<CheckResult>} 检查结果
 */
export async function checkOggencExec(): Promise<CheckResult> {
  return checkExecutable('oggenc', '-v', 'oggenc');
}

/**
 * 检查可执行文件是否存在
 *
 * @param command - 检查命令
 * @param args - 命令参数
 * @param name - 可执行文件名称（用于显示）
 * @returns 检查结果
 */
async function checkExecutable(command: string, args: string, name: string): Promise<CheckResult> {
  try {
    // 使用 Tauri 的 command API 执行版本检查
    const result = await executeCommand(command, [args]);

    if (result.success) {
      return {
        success: true,
        executable: name,
        message: `${name} is available`,
      };
    } else {
      return {
        success: false,
        executable: name,
        message: `${name} not found or cannot execute (command "${command} ${args}" failed)`,
      };
    }
  } catch (error) {
    return {
      success: false,
      executable: name,
      message: `${name} not found or cannot execute: ${error}`,
    };
  }
}

/**
 * 执行命令并返回结果
 */
async function executeCommand(
  command: string,
  args: string[]
): Promise<{
  success: boolean;
  stdout: string;
  stderr: string;
}> {
  try {
    // 通过 Tauri 后端执行命令
    const result = await invoke<{ success: boolean; stdout: string; stderr: string }>(
      'check_executable',
      {
        command,
        args,
      }
    );

    return result;
  } catch (error) {
    // 如果后端命令未实现，尝试直接检查
    // 这是一个备选方案
    console.warn(`Backend command 'check_executable' not available, using fallback`);

    // 尝试使用简单的错误处理
    return {
      success: false,
      stdout: '',
      stderr: String(error),
    };
  }
}

/**
 * 批量检查多个可执行文件
 *
 * @param executables - 要检查的可执行文件列表
 * @returns 所有检查结果
 */
export async function checkMultipleExecutables(
  executables: Array<{ command: string; args: string; name: string }>
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const exec of executables) {
    const result = await checkExecutable(exec.command, exec.args, exec.name);
    results.push(result);
  }

  return results;
}

/**
 * 常用的媒体处理可执行文件列表
 */
export const COMMON_MEDIA_EXECUTABLES = [
  { command: 'ffmpeg', args: '-version', name: 'ffmpeg' },
  { command: 'flac', args: '--version', name: 'flac' },
  { command: 'oggenc', args: '-v', name: 'oggenc' },
];

/**
 * 检查所有常用媒体处理可执行文件
 *
 * @returns {Promise<CheckResult[]>} 所有检查结果
 */
export async function checkAllMediaExecutables(): Promise<CheckResult[]> {
  return checkMultipleExecutables(COMMON_MEDIA_EXECUTABLES);
}
