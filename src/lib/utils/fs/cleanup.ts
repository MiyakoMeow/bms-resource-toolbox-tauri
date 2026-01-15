/**
 * 目录清理工具
 */

import { readDir, remove } from '@tauri-apps/plugin-fs';
import { isDirHavingFile } from './compare.js';

/**
 * 递归删除指定目录下的所有空文件夹
 */
export async function removeEmptyFolders(
  parentDir: string,
  dryRun: boolean
): Promise<void> {
  try {
    const entries = await readDir(parentDir);

    for (const entry of entries) {
      // 只处理目录
      if (entry.children === undefined) {
        continue;
      }

      if (!entry.name) {
        continue;
      }

      const path = `${parentDir}/${entry.name}`;

      // 递归检查子目录
      await removeEmptyFolders(path, dryRun);

      // 检查当前目录是否为空
      const hasFile = await isDirHavingFile(path);

      if (!hasFile) {
        console.log(`Remove empty dir: ${path}`);
        if (dryRun) {
          console.log(`[dry-run] Skipped removing ${path}`);
        } else {
          try {
            await remove(path, { recursive: true });
          } catch (error) {
            console.error(`Failed to remove ${path}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to remove empty folders in ${parentDir}:`, error);
  }
}
