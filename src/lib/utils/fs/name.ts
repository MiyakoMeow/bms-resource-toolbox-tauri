/**
 * 文件名验证和修复模块
 * 从 Python 代码迁移：legacy/fs/name.py
 */

/**
 * 检查文件名是否合法
 */
export function isFileNameValid(fileName: string): boolean {
  // Windows 非法字符
  const windowsIllegalChars = /[:"\\/*?"<>|]/;
  // 控制字符 (0x00-0x1F)
  const controlChars = /[\x00-\x1F]/;
  // 保留名称 (CON, PRN, AUX, NUL, COM1-COM9, LPT1-LPT9)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

  return !(
    windowsIllegalChars.test(fileName) ||
    controlChars.test(fileName) ||
    reservedNames.test(fileName)
  );
}

/**
 * 获取有效的文件系统名称
 * 替换文件系统中的非法字符
 *
 * @param oriName - 原始文件名
 * @returns 有效的文件系统名称
 */
export function getValidFsName(oriName: string): string {
  // 需要替换的非法字符映射
  const illegalChars: Record<string, string> = {
    ':': '：',
    '\\': '／',
    '/': '／',
    '*': '＊',
    '?': '？',
    '!': '！',
    '"': '＂',
    '<': '＜',
    '>': '＞',
    '|': '｜',
  };

  let result = oriName;
  for (const [illegal, replacement] of Object.entries(illegalChars)) {
    result = result.replaceAll(illegal, replacement);
  }

  return result;
}

/**
 * 获取工作文件夹名称
 *
 * @param id - 作品 ID
 * @param title - 标题
 * @param artist - 艺术家
 * @returns 工作文件夹名称
 */
export function getWorkFolderName(id: string, title: string, artist: string): string {
  const validTitle = getValidFsName(title);
  const validArtist = getValidFsName(artist);
  return `${id}. ${validTitle} [${validArtist}]`;
}
