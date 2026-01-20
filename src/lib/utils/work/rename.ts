/**
 * 工作目录重命名工具
 */

import { exists, readDir, remove, rename } from '@tauri-apps/plugin-fs';
import { getDirBmsInfo } from '../bms/scanner';
import { getValidFileName } from '../fs/path';
import { bmsDirSimilarity } from '../fs/similarity';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '../fs/moving';

/**
 * 默认标题
 */
export const DEFAULT_TITLE = '!!! UnknownTitle !!!';

/**
 * 默认艺术家
 */
export const DEFAULT_ARTIST = '!!! UnknownArtist !!!';

/**
 * BMS 文件夹命名类型
 */
export enum BmsFolderSetNameType {
  /** 替换为 "Title [Artist]" */
  ReplaceTitleArtist = 0,
  /** 追加 " Title [Artist]" */
  AppendTitleArtist = 1,
  /** 追加 " [Artist]" */
  AppendArtist = 2,
}

/**
 * 检查目录名是否已格式化
 */
function isAlreadyFormatted(dirName: string, setType: BmsFolderSetNameType): boolean {
  switch (setType) {
    case BmsFolderSetNameType.ReplaceTitleArtist:
    case BmsFolderSetNameType.AppendTitleArtist:
      return dirName.includes(' [') && dirName.endsWith(']');
    case BmsFolderSetNameType.AppendArtist:
      return dirName.includes(' [') && dirName.endsWith(']');
  }
}

/**
 * 尝试从嵌套的子目录中移出文件
 * 对应 Python: _workdir_set_name_by_bms (bms_folder.py:91-109)
 *
 * 当工作目录没有 BMS 文件时，尝试处理嵌套目录结构
 *
 * @param workDir - 工作目录路径
 * @returns 是否成功处理
 */
async function tryMoveOutNestedFiles(workDir: string): Promise<boolean> {
  console.log(`${workDir} has no bms/bmson files! Trying to move out nested files.`);

  const entries = await readDir(workDir);

  // 如果目录为空，删除目录
  if (entries.length === 0) {
    console.log(' - Empty dir! Deleting...');
    try {
      await remove(workDir, { recursive: true });
    } catch (error) {
      console.error('Failed to remove empty directory:', error);
    }
    return false;
  }

  // 如果不止一个元素，跳过
  if (entries.length !== 1) {
    console.log(` - Element count: ${entries.length}`);
    return false;
  }

  const nestedEntry = entries[0];

  // 如果不是目录，跳过
  if (!nestedEntry.isDirectory) {
    console.log(` - Folder has only a file: ${nestedEntry.name}`);
    return false;
  }

  // 将嵌套目录的内容移动到当前目录
  const nestedPath = `${workDir}/${nestedEntry.name}`;
  console.log(' - Moving out nested files...');
  await moveElementsAcrossDir(nestedPath, workDir, replaceOptionsFromPreset(ReplacePreset.Default));

  return true;
}

/**
 * 根据 BMS 信息设置目录名
 * 对应 Python: set_name_by_bms (bms_folder.py:89-168)
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 根据 BMS 重命名工作目录
 * @description 根据 BMS 文件信息重命名工作目录，支持多种命名策略
 * @frontend true
 *
 * @param {string} workDir - 工作目录路径
 * @param {BmsFolderSetNameType} setType - 命名方式
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @param {ReplacePreset} replacePreset - 文件替换策略
 * @param {boolean} skipAlreadyFormatted - 跳过已格式化的目录
 *
 * @returns {Promise<void>}
 */
export async function setNameByBms(
  workDir: string,
  setType: BmsFolderSetNameType,
  dryRun: boolean,
  replacePreset: ReplacePreset,
  skipAlreadyFormatted: boolean
): Promise<void> {
  // 获取 BMS 信息，如果没有则尝试处理嵌套目录
  let bmsInfo = await getDirBmsInfo(workDir);

  while (!bmsInfo) {
    // 尝试从嵌套目录中移出文件
    const moved = await tryMoveOutNestedFiles(workDir);
    if (!moved) {
      console.log(`${workDir} has no bms/bmson files!`);
      return;
    }
    // 再次尝试获取 BMS 信息
    bmsInfo = await getDirBmsInfo(workDir);
  }

  // 获取父目录路径
  const lastSlashIndex = Math.max(workDir.lastIndexOf('/'), workDir.lastIndexOf('\\'));
  const parentDir = lastSlashIndex === -1 ? '' : workDir.substring(0, lastSlashIndex);

  if (!parentDir) {
    console.error('Parent directory is empty!');
    return;
  }

  const title = bmsInfo.bms.musicInfo.title || DEFAULT_TITLE;
  const artist = bmsInfo.bms.musicInfo.artist || DEFAULT_ARTIST;

  // 检查标题和艺术家是否为空
  if (title === DEFAULT_TITLE && artist === DEFAULT_ARTIST) {
    console.log(`${workDir}: Info title and artist is EMPTY!`);
    return;
  }

  // 获取有效的文件系统名称
  const validTitle = getValidFileName(title);
  const validArtist = getValidFileName(artist);

  // 获取当前目录名
  const workDirName = workDir.split(/[/\\]/).pop() || workDir;

  // 如果启用跳过已格式化目录的选项
  if (skipAlreadyFormatted && isAlreadyFormatted(workDirName, setType)) {
    if (dryRun) {
      console.log(`[dry-run] Directory already formatted, skipping: ${workDir}`);
    }
    return;
  }

  // 构建目标目录名
  let targetDirName: string;
  switch (setType) {
    case BmsFolderSetNameType.ReplaceTitleArtist:
      targetDirName = `${validTitle} [${validArtist}]`;
      break;
    case BmsFolderSetNameType.AppendTitleArtist:
      targetDirName = `${workDirName} ${validTitle} [${validArtist}]`;
      break;
    case BmsFolderSetNameType.AppendArtist:
      targetDirName = `${workDirName} [${validArtist}]`;
      break;
  }

  // 构建目标目录路径
  const targetWorkDir = `${parentDir}/${targetDirName}`;

  // 如果源目录与目标目录相同，则跳过操作
  if (workDir === targetWorkDir) {
    if (dryRun) {
      console.log(`[dry-run] Source and target directories are the same, skipping: ${workDir}`);
    }
    return;
  }

  console.log(`${workDir}: Rename! Title: ${title}; Artist: ${artist}`);

  if (await exists(targetWorkDir)) {
    // 目标目录已存在，计算相似度
    const similarity = await bmsDirSimilarity(workDir, targetWorkDir);
    console.log(` - Directory ${targetWorkDir} exists! Similarity: ${similarity}`);

    if (similarity < 0.8) {
      console.log(' - Merge canceled (similarity < 0.8)');
      return;
    }

    console.log(' - Merge start!');
    if (!dryRun) {
      await moveElementsAcrossDir(workDir, targetWorkDir, replaceOptionsFromPreset(replacePreset));
    }
  } else {
    // 目标目录不存在，直接移动
    if (!dryRun) {
      await rename(workDir, targetWorkDir);
    }
  }

  if (dryRun) {
    console.log(`[dry-run] End: work::setNameByBms`);
  }
}

/**
 * 撤销目录命名设置
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 撤销工作目录重命名
 * @description 撤销之前的目录重命名操作，恢复原始目录名
 * @frontend true
 *
 * @param {string} workDir - 工作目录路径
 * @param {BmsFolderSetNameType} setType - 命名方式
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function undoSetNameByBms(
  workDir: string,
  setType: BmsFolderSetNameType,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`[dry-run] Start: work::undoSetNameByBms`);
  }

  const workDirName = workDir.split(/[/\\]/).pop() || workDir;

  // 根据不同的 set_type，提取原始目录名
  let originalDirName: string;

  switch (setType) {
    case BmsFolderSetNameType.ReplaceTitleArtist:
    case BmsFolderSetNameType.AppendTitleArtist:
    case BmsFolderSetNameType.AppendArtist:
      // 原始名称应该是第一个单词
      originalDirName = workDirName.split(/\s+/)[0] || workDirName;
      break;
  }

  // 确保至少保留1个单词
  if (originalDirName === '') {
    originalDirName = workDirName;
  }

  // 构建新目录路径
  const lastSlashIndex = Math.max(workDir.lastIndexOf('/'), workDir.lastIndexOf('\\'));
  const parentDir = lastSlashIndex === -1 ? '' : workDir.substring(0, lastSlashIndex);
  const baseNewDirPath = `${parentDir}/${originalDirName}`;
  let newDirPath = baseNewDirPath;

  // 如果源目录与目标目录相同，则跳过操作
  if (workDir === newDirPath) {
    if (dryRun) {
      console.log(`[dry-run] Source and target directories are the same, skipping: ${workDir}`);
    }
    return;
  }

  // 检查目标目录是否已存在，如果存在则添加数字后缀
  let counter = 1;

  while (await exists(newDirPath)) {
    newDirPath = `${baseNewDirPath}_${counter}`;
    counter++;

    // 避免无限循环，最多尝试100次
    if (counter > 100) {
      console.warn(`Failed to find available name after 100 attempts for: ${originalDirName}`);
      return;
    }
  }

  console.log(`Undo rename: ${workDir} -> ${newDirPath}`);

  if (!dryRun) {
    await rename(workDir, newDirPath);
  }

  if (dryRun) {
    console.log(`[dry-run] End: work::undoSetNameByBms`);
  }
}

/**
 * 追加艺术家名称（根目录版本）
 * 该脚本适用于希望在作品文件夹名后添加" [艺术家]"的情况。
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 追加艺术家名称
 * @description 在作品文件夹名后追加艺术家名称
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function appendArtistNameByBms(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);
  const pairs: Array<{ from: string; to: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) {
      continue;
    }

    const dirPath = `${rootDir}/${entry.name}`;

    // 已设置过？
    if (entry.name.endsWith(']')) {
      continue;
    }

    const bmsInfo = await getDirBmsInfo(dirPath);
    if (!bmsInfo) {
      console.log(`Dir ${dirPath} has no bms files!`);
      continue;
    }

    const artist = bmsInfo.bms.musicInfo.artist || DEFAULT_ARTIST;
    const validArtist = getValidFileName(artist);
    const newDirName = `${entry.name} [${validArtist}]`;

    console.log(`- Ready to rename: ${entry.name} -> ${newDirName}`);

    pairs.push({
      from: dirPath,
      to: `${rootDir}/${newDirName}`,
    });
  }

  // 执行重命名
  console.log(`There are ${pairs.length} rename actions.`);

  if (dryRun) {
    for (const { from, to } of pairs) {
      console.log(`[dry-run] Would rename: ${from} -> ${to}`);
    }
    console.log('[dry-run] End: work::appendArtistNameByBms');
    return;
  }

  for (const { from, to } of pairs) {
    try {
      await rename(from, to);
    } catch (error) {
      console.error(`Failed to rename ${from}:`, error);
    }
  }

  console.log('Completed successfully');
}

/**
 * 根据 BMS 信息设置目录名（优化版本，支持嵌套目录处理和相似度合并）
 * 对应 Python: _workdir_set_name_by_bms (bms_folder.py:89-149)
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 根据 BMS 重命名工作目录（优化版）
 * @description 根据 BMS 文件信息重命名工作目录，支持嵌套目录处理和相似度合并
 * @frontend true
 *
 * @param {string} workDir - 工作目录路径
 * @param {BmsFolderSetNameType} setType - 命名方式
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @param {ReplacePreset} replacePreset - 文件替换策略
 *
 * @returns {Promise<boolean>} 是否成功处理
 */
export async function setNameByBmsOptimized(
  workDir: string,
  setType: BmsFolderSetNameType,
  dryRun: boolean,
  replacePreset: ReplacePreset
): Promise<boolean> {
  // 获取 BMS 信息，如果没有则尝试处理嵌套目录
  let bmsInfo = await getDirBmsInfo(workDir);

  while (!bmsInfo) {
    // 尝试从嵌套目录中移出文件
    const moved = await tryMoveOutNestedFiles(workDir);
    if (!moved) {
      return false;
    }
    // 再次尝试获取 BMS 信息
    bmsInfo = await getDirBmsInfo(workDir);
  }

  // 获取父目录路径
  const lastSlashIndex = Math.max(workDir.lastIndexOf('/'), workDir.lastIndexOf('\\'));
  const parentDir = lastSlashIndex === -1 ? '' : workDir.substring(0, lastSlashIndex);

  if (!parentDir) {
    console.error('Parent directory is empty!');
    return false;
  }

  // 获取标题和艺术家
  const title = bmsInfo.bms.musicInfo.title || DEFAULT_TITLE;
  const artist = bmsInfo.bms.musicInfo.artist || DEFAULT_ARTIST;

  // 检查标题和艺术家是否为空
  if (title === DEFAULT_TITLE && artist === DEFAULT_ARTIST) {
    console.log(`${workDir}: Info title and artist is EMPTY!`);
    return false;
  }

  // 构建新的目录名
  const validTitle = getValidFileName(title);
  const validArtist = getValidFileName(artist);
  let targetDirName: string;
  let workDirName: string;

  switch (setType) {
    case BmsFolderSetNameType.ReplaceTitleArtist:
      targetDirName = `${validTitle} [${validArtist}]`;
      break;
    case BmsFolderSetNameType.AppendTitleArtist: {
      const dirNameForAppend = workDir.split(/[/\\]/).pop() || workDir;
      targetDirName = `${dirNameForAppend} ${validTitle} [${validArtist}]`;
      break;
    }
    case BmsFolderSetNameType.AppendArtist: {
      const dirNameForArtist = workDir.split(/[/\\]/).pop() || workDir;
      targetDirName = `${dirNameForArtist} [${validArtist}]`;
      break;
    }
  }

  // 构建目标目录路径
  const targetWorkDir = `${parentDir}/${targetDirName}`;

  // 如果源目录与目标目录相同，则跳过
  if (workDir === targetWorkDir) {
    if (dryRun) {
      console.log(`[dry-run] Source and target directories are the same: ${workDir}`);
    }
    return true;
  }

  console.log(`${workDir}: Rename! Title: ${title}; Artist: ${artist}`);

  if (await exists(targetWorkDir)) {
    // 目标目录已存在，计算相似度
    const similarity = await bmsDirSimilarity(workDir, targetWorkDir);
    console.log(` - Directory ${targetWorkDir} exists! Similarity: ${similarity}`);

    if (similarity < 0.8) {
      console.log(' - Merge canceled (similarity < 0.8)');
      return false;
    }

    console.log(' - Merge start!');
    if (!dryRun) {
      await moveElementsAcrossDir(workDir, targetWorkDir, replaceOptionsFromPreset(replacePreset));
    }
  } else {
    // 目标目录不存在，直接移动
    if (!dryRun) {
      await rename(workDir, targetWorkDir);
    }
  }

  return true;
}
