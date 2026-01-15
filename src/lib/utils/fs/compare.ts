/**
 * 文件比较工具
 */

import { isFileSameContent as checkFileSameContent } from './hash.js';
import { readDir } from '@tauri-apps/plugin-fs';

/**
 * 检查目录是否包含文件
 */
export async function isDirHavingFile(dirPath: string): Promise<boolean> {
  try {
    const entries = await readDir(dirPath);

    for (const entry of entries) {
      // 检查是否为文件
      if (!entry.isDirectory) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check directory: ${dirPath}`, error);
    return false;
  }
}

/**
 * 导出文件哈希比较函数
 */
export { isFileSameContent, calculateFileHash } from './hash.js';

/**
 * 比较两个目录的文件差异
 */
export interface DirDiff {
  onlyInA: string[];
  onlyInB: string[];
  different: string[];
  same: string[];
}

export async function compareDirectories(
  dirA: string,
  dirB: string,
  options?: {
    checkContent?: boolean;
  }
): Promise<DirDiff> {
  const diff: DirDiff = {
    onlyInA: [],
    onlyInB: [],
    different: [],
    same: [],
  };

  try {
    const [entriesA, entriesB] = await Promise.all([readDir(dirA), readDir(dirB)]);

    const mapA = new Map<string, { size: number; modified?: number }>();
    const mapB = new Map<string, string>();

    // 构建 A 的文件映射
    for (const entry of entriesA) {
      if (entry.isDirectory) continue;
      if (!entry.name) continue;

      const { stat } = await import('@tauri-apps/plugin-fs');
      const meta = await stat(`${dirA}/${entry.name}`);
      mapA.set(entry.name, { size: meta.size, modified: meta.mtime?.getTime() });
    }

    // 构建 B 的文件映射
    for (const entry of entriesB) {
      if (entry.isDirectory) continue;
      if (!entry.name) continue;

      mapB.set(entry.name, `${dirB}/${entry.name}`);
    }

    // 比较文件
    for (const [name, fileA] of mapA) {
      if (!mapB.has(name)) {
        diff.onlyInA.push(name);
        continue;
      }

      const pathB = mapB.get(name)!;

      if (options?.checkContent) {
        // 比较内容
        const pathA = `${dirA}/${name}`;
        const same = await checkFileSameContent(pathA, pathB);
        if (same) {
          diff.same.push(name);
        } else {
          diff.different.push(name);
        }
      } else {
        // 只比较大小
        const { stat } = await import('@tauri-apps/plugin-fs');
        const metaB = await stat(pathB);
        if (metaB.size === fileA.size) {
          diff.same.push(name);
        } else {
          diff.different.push(name);
        }
      }
    }

    // 找出只在 B 中的文件
    for (const name of mapB.keys()) {
      if (!mapA.has(name)) {
        diff.onlyInB.push(name);
      }
    }
  } catch (error) {
    console.error('Failed to compare directories:', error);
  }

  return diff;
}
