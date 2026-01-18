/**
 * 合并带艺术家的文件夹
 * 从 Python 代码迁移：legacy/options/bms_folder_bigpack.py 中的 merge_split_folders 函数
 */

import { readDir, exists, remove } from '@tauri-apps/plugin-fs';
import {
  moveElementsAcrossDir,
  replaceOptionsFromPreset,
  ReplacePreset,
} from '$lib/utils/fs/moving.js';

/**
 * 合并拆分的文件夹（将 `Title [Artist]` 合并到 `Title` 中）
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 合并带艺术家的文件夹
 * @description 将形如 "Title [Artist]" 的文件夹内容合并到 "Title" 文件夹中
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function mergeSplitFolders(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);

  // 只处理目录
  const dirNames = entries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  const pairs: Array<{ target: string; source: string }> = [];

  for (const dirName of dirNames) {
    // Situation 1: 结尾为 "]"
    if (!dirName.endsWith(']')) {
      continue;
    }

    // 找到 "[" 的位置
    const bracketIndex = dirName.lastIndexOf('[');
    if (bracketIndex === -1) {
      continue;
    }

    const dirNameWithoutArtist = dirName.substring(0, bracketIndex - 1);

    if (dirNameWithoutArtist.length === 0) {
      continue;
    }

    // 检查目标目录是否存在
    const targetDirPath = `${rootDir}/${dirNameWithoutArtist}`;
    if (!(await exists(targetDirPath))) {
      continue;
    }

    // 检查是否还有其他同名文件夹（如 "Title [Artist2]", "Title [Artist3]"）
    const dirNamesWithStarter = dirNames.filter((name) =>
      name.startsWith(`${dirNameWithoutArtist} [`)
    );

    if (dirNamesWithStarter.length > 2) {
      console.log(` !_! ${dirNameWithoutArtist} has more than 2 folders! ${dirNamesWithStarter}`);
      continue;
    }

    // 添加到合并列表
    pairs.push({ target: dirNameWithoutArtist, source: dirName });
  }

  // 检查重复
  const duplicateList: string[] = [];
  let lastFromDirName = '';

  for (const { source } of pairs) {
    if (lastFromDirName === source) {
      duplicateList.push(source);
    }
    lastFromDirName = source;
  }

  if (duplicateList.length > 0) {
    console.log('Duplicate!');
    for (const name of duplicateList) {
      console.log(` -> ${name}`);
    }
    throw new Error('Duplicate folder names found. Aborting.');
  }

  // 打印并确认
  for (const { source, target } of pairs) {
    console.log(`- Find Dir pair: ${target} <- ${source}`);
  }

  console.log(`There are ${pairs.length} merge actions.`);

  if (dryRun) {
    console.log('[dry-run] Skipping actual merge operations.');
    return;
  }

  // 在实际执行前，应该有确认对话框
  // 这里我们直接执行（前端可以处理确认）

  for (const { source, target } of pairs) {
    const sourcePath = `${rootDir}/${source}`;
    const targetPath = `${rootDir}/${target}`;

    console.log(` - Merging: ${source} -> ${target}`);

    await moveElementsAcrossDir(
      sourcePath,
      targetPath,
      replaceOptionsFromPreset(ReplacePreset.Default)
    );
  }

  // 删除空源文件夹
  for (const { source } of pairs) {
    const sourcePath = `${rootDir}/${source}`;

    try {
      const sourceEntries = await readDir(sourcePath);
      if (sourceEntries.length === 0) {
        await remove(sourcePath, { recursive: true });
      }
    } catch (error) {
      console.warn(`Failed to remove empty folder ${sourcePath}:`, error);
    }
  }
}
