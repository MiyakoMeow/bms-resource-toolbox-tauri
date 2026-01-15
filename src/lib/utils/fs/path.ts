/**
 * 路径处理工具
 * 提供跨平台的路径处理功能
 */

/**
 * 获取文件扩展名（小写）
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * 获取文件名（不含扩展名）
 */
export function getFileStem(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return fileName;
  }

  return fileName.substring(0, lastDotIndex);
}

/**
 * 获取文件名（含扩展名）
 */
export function getFileName(filePath: string): string {
  return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
}

/**
 * 获取目录路径
 */
export function getDirectoryPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/);
  parts.pop();
  return parts.join('/');
}

/**
 * 连接路径
 */
export function joinPath(...parts: string[]): string {
  return parts.join('/').replaceAll(/\\/g, '/');
}

/**
 * 规范化路径
 */
export function normalizePath(filePath: string): string {
  return filePath.replaceAll(/\\/g, '/');
}

/**
 * 检查路径是否为绝对路径
 */
export function isAbsolutePath(filePath: string): boolean {
  return filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath);
}

/**
 * 获取相对路径
 */
export function getRelativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split('/');
  const toParts = normalizePath(to).split('/');

  // 找到公共前缀
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }

  // 计算需要返回的层数
  const upCount = fromParts.length - i - 1;

  // 构建相对路径
  const relativeParts: string[] = [];

  for (let j = 0; j < upCount; j++) {
    relativeParts.push('..');
  }

  relativeParts.push(...toParts.slice(i));

  return relativeParts.join('/');
}

/**
 * 验证文件名（移除非法字符）
 */
export function getValidFileName(fileName: string): string {
  // 移除或替换非法字符（Windows 不允许的字符）
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/g;
  let validName = fileName.replaceAll(invalidChars, '_');

  // 移除前后空格
  validName = validName.trim();

  // 如果为空，使用默认名称
  if (validName === '') {
    validName = 'unnamed';
  }

  return validName;
}
