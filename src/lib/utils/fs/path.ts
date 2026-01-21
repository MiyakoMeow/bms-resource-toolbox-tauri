/**
 * 路径处理工具
 * 使用 node:path 提供跨平台的路径处理功能
 */

import path from 'node:path';

/**
 * 获取文件扩展名（小写，不带点）
 */
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext ? ext.slice(1).toLowerCase() : '';
}

/**
 * 获取文件名（不含扩展名）
 */
export function getFileStem(filePath: string): string {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);
  return ext ? base.slice(0, -ext.length) : base;
}

/**
 * 连接路径（统一使用正斜杠）
 */
export function joinPath(...parts: string[]): string {
  return path.join(...parts).replaceAll('\\', '/');
}

/**
 * 规范化路径（统一使用正斜杠）
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replaceAll('\\', '/');
}

/**
 * 验证文件名（移除非法字符）
 */
export function getValidFileName(fileName: string): string {
  const invalidChars = /[<>:"/\\|?*]/g;
  let validName = fileName.replaceAll(invalidChars, '_');

  for (let i = 0; i <= 31; i++) {
    validName = validName.replace(String.fromCharCode(i), '_');
  }

  validName = validName.trim();

  if (validName === '') {
    validName = 'unnamed';
  }

  return validName;
}
