/**
 * 文件哈希工具
 * 使用 Web Crypto API 计算 SHA512 哈希值
 */

/**
 * 计算文件的 SHA512 哈希值
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const { readFile } = await import('@tauri-apps/plugin-fs');

  try {
    const bytes = await readFile(filePath);

    // 使用 Web Crypto API 计算 SHA512
    const hashBuffer = await crypto.subtle.digest('SHA-512', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // 转换为十六进制字符串
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    throw new Error(`Failed to calculate file hash: ${error}`);
  }
}

/**
 * 比较两个文件的内容是否相同
 * 通过文件大小和 SHA512 哈希值进行比较
 */
export async function isFileSameContent(file1: string, file2: string): Promise<boolean> {
  const { stat } = await import('@tauri-apps/plugin-fs');

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
