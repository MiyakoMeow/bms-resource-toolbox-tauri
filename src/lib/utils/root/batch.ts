/**
 * 根目录批量操作工具
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { setNameByBms, undoSetNameByBms, BmsFolderSetNameType } from '$lib/utils/work/rename.js';
import { ReplacePreset } from '$lib/utils/fs/moving.js';

/**
 * 递归设置目录名（根目录版本）
 *
 * @command
 * @category root
 * @dangerous true
 * @description 递归为根目录下的所有工作目录设置名称
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {BmsFolderSetNameType} setType - 命名方式
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @param {ReplacePreset} replacePreset - 文件替换策略
 *
 * @returns {Promise<void>}
 */
export async function rootSetNameByBms(
  rootDir: string,
  setType: BmsFolderSetNameType,
  dryRun: boolean,
  replacePreset: ReplacePreset
): Promise<void> {
  const entries = await readDir(rootDir);

  for (const entry of entries) {
    // 只处理目录
    if (!entry.isDirectory) {
      continue;
    }

    if (!entry.name) {
      continue;
    }

    const workDir = `${rootDir}/${entry.name}`;
    await setNameByBms(workDir, setType, dryRun, replacePreset, false);
  }
}

/**
 * 递归撤销目录名设置（根目录版本）
 *
 * @command
 * @category root
 * @dangerous true
 * @description 递归撤销根目录下所有工作目录的名称设置
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {BmsFolderSetNameType} setType - 命名方式
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function rootUndoSetNameByBms(
  rootDir: string,
  setType: BmsFolderSetNameType,
  dryRun: boolean
): Promise<void> {
  const entries = await readDir(rootDir);

  for (const entry of entries) {
    // 只处理目录
    if (!entry.isDirectory) {
      continue;
    }

    if (!entry.name) {
      continue;
    }

    const workDir = `${rootDir}/${entry.name}`;
    await undoSetNameByBms(workDir, setType, dryRun);
  }
}

/**
 * 复制编号目录名
 *
 * @command
 * @category root
 * @dangerous true
 * @description 复制编号目录的名称到目标目录
 * @frontend true
 *
 * @param {string} fromDir - 源目录路径
 * @param {string} toDir - 目标目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function copyNumberedWorkdirNames(
  fromDir: string,
  toDir: string,
  dryRun: boolean
): Promise<void> {
  const { exists, mkdir, writeFile } = await import('@tauri-apps/plugin-fs');

  const entries = await readDir(fromDir);
  const nameMap = new Map<string, string>();

  // 构建编号到名称的映射
  for (const entry of entries) {
    if (!entry.isDirectory) {
      continue;
    }

    if (!entry.name) {
      continue;
    }

    const match = entry.name.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const [, num, name] = match;
      nameMap.set(num, name);
    }
  }

  // 应用到目标目录
  const toEntries = await readDir(toDir);

  for (const entry of toEntries) {
    if (!entry.isDirectory) {
      continue;
    }

    if (!entry.name) {
      continue;
    }

    const match = entry.name.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const [, num, _currentName] = match;
      const newName = nameMap.get(num);

      if (newName) {
        const newDirName = `${num} ${newName}`;
        const oldPath = `${toDir}/${entry.name}`;
        const newPath = `${toDir}/${newDirName}`;

        if (dryRun) {
          console.log(`[dry-run] Would rename: ${oldPath} -> ${newPath}`);
        } else {
          try {
            const { rename } = await import('@tauri-apps/plugin-fs');
            await rename(oldPath, newPath);
          } catch (error) {
            console.error(`Failed to rename ${oldPath}:`, error);
          }
        }
      }
    }
  }
}
