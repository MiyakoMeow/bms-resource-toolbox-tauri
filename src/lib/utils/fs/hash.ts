/**
 * 文件哈希工具
 * 使用 Web Crypto API 计算 SHA512 哈希值
 */

import { readFile, stat } from '@tauri-apps/plugin-fs';

/**
 * 日期时间元组
 */
export interface DateTimeTuple {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * 计算文件的 SHA512 哈希值
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);

  // 使用 Web Crypto API 计算 SHA512
  const hashBuffer = await crypto.subtle.digest('SHA-512', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // 转换为十六进制字符串
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 比较两个文件的内容是否相同
 * 通过文件大小和 SHA512 哈希值进行比较
 */
export async function isFileSameContent(file1: string, file2: string): Promise<boolean> {
  try {
    // 先比较文件大小
    const [meta1, meta2] = await Promise.all([stat(file1), stat(file2)]);

    if (meta1.size !== meta2.size) {
      return false;
    }

    // 大小相同，再比较哈希值
    const [hash1, hash2] = await Promise.all([calculateFileHash(file1), calculateFileHash(file2)]);

    return hash1 === hash2;
  } catch (error) {
    console.error('Failed to compare files:', error);
    return false;
  }
}

/**
 * 从时间戳获取日期时间元组
 *
 * @param timestamp - 时间戳（毫秒）
 * @returns 日期时间元组（本地时间）
 */
export function getDateTimeTupleFromTimestamp(timestamp: number): DateTimeTuple {
  const date = new Date(timestamp);

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

/**
 * 从日期时间元组创建 Date 对象（本地时间）
 */
function createDateFromTuple(dateTimeTuple: DateTimeTuple): Date {
  const { year, month, day, hour, minute } = dateTimeTuple;
  return new Date(year, month - 1, day, hour, minute);
}

/**
 * 设置文件的修改时间
 *
 * 注意：由于 Tauri FS 插件的限制，此功能在 Windows 和 Linux 上可能不可用
 * 在 macOS 上可以使用 `touch` 命令来设置时间
 *
 * @param targetPath - 文件路径
 * @param dateTimeTuple - 日期时间元组 (Y, M, D, H, M)
 * @throws 如果设置失败
 */
export async function setFileModificationTime(
  targetPath: string,
  dateTimeTuple: DateTimeTuple
): Promise<void> {
  const date = createDateFromTuple(dateTimeTuple);

  try {
    // 尝试使用 Node.js fs 设置时间（在 Node.js 环境中）
    const fs = await import('fs');
    const timestamp = date.getTime() / 1000;
    fs.utimesSync(targetPath, timestamp, timestamp);
  } catch {
    // 在 Tauri 环境中，使用 shell 命令设置时间
    try {
      const { Command } = await import('@tauri-apps/plugin-shell');

      // 格式化日期字符串用于 Windows PowerShell
      const psDateString = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
      const isoString = date.toISOString();

      // Windows: 使用 PowerShell（使用 -LiteralPath 防止路径注入）
      if (navigator.platform?.toLowerCase().includes('win')) {
        const ps1Script = `(Get-Item -LiteralPath "${targetPath}").LastWriteTime = Get-Date "${psDateString}"`;
        await Command.create('powershell', ['-Command', ps1Script]).execute();
      } // macOS/Linux: 使用 touch 命令
      else {
        await Command.create('touch', ['-d', isoString, targetPath]).execute();
      }
    } catch (err) {
      // 如果文件不存在，忽略错误
      if (err instanceof Error && !err.message.includes('no such file')) {
        console.error(`Failed to set modification time for ${targetPath}:`, err);
      }
    }
  }
}
