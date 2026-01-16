/**
 * 工作目录重命名工具
 */

import { readDir, rename, exists } from '@tauri-apps/plugin-fs';
import { getDirBmsInfo } from '$lib/utils/bms/scanner.js';
import { getValidFileName } from '$lib/utils/fs/path.js';
import {
  moveElementsAcrossDir,
  replaceOptionsFromPreset,
  type ReplacePreset,
} from '$lib/utils/fs/moving.js';

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
 * 根据 BMS 信息设置目录名
 *
 * @command
 * @category work
 * @dangerous true
 * @description 根据 BMS 文件信息重命名工作目录
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
  const bmsInfo = await getDirBmsInfo(workDir);

  if (!bmsInfo) {
    console.log(`BMS file not found, skipping: ${workDir}`);
    return;
  }

  const title = bmsInfo.bms.musicInfo.title || DEFAULT_TITLE;
  const artist = bmsInfo.bms.musicInfo.artist || DEFAULT_ARTIST;

  // 获取当前目录名
  const workDirName = workDir.split('/').pop() || workDir.split('\\').pop() || workDir;

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
      targetDirName = `${title} [${artist}]`;
      break;
    case BmsFolderSetNameType.AppendTitleArtist:
      targetDirName = `${workDirName} ${title} [${artist}]`;
      break;
    case BmsFolderSetNameType.AppendArtist:
      targetDirName = `${workDirName} [${artist}]`;
      break;
  }

  // 获取有效的文件系统名称
  targetDirName = getValidFileName(targetDirName);

  // 构建目标目录路径
  const parentDir = workDir.substring(0, workDir.lastIndexOf('/'));
  const targetWorkDir = `${parentDir}/${targetDirName}`;

  // 如果源目录与目标目录相同，则跳过操作
  if (workDir === targetWorkDir) {
    if (dryRun) {
      console.log(`[dry-run] Source and target directories are the same, skipping: ${workDir}`);
    }
    return;
  }

  console.log(`Rename work dir by moving content: ${workDir} -> ${targetWorkDir}`);

  if (!dryRun) {
    const replaceOptions = replaceOptionsFromPreset(replacePreset);
    await moveElementsAcrossDir(workDir, targetWorkDir, replaceOptions);
  }

  if (dryRun) {
    console.log(`[dry-run] End: work::setNameByBms`);
  }
}

/**
 * 撤销目录命名设置
 *
 * @command
 * @category work
 * @dangerous true
 * @description 撤销之前的目录重命名操作
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

  const workDirName = workDir.split('/').pop() || workDir.split('\\').pop() || workDir;

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
  const parentDir = workDir.substring(0, workDir.lastIndexOf('/'));
  let newDirPath = `${parentDir}/${originalDirName}`;

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
    newDirPath = `${parentDir}/${originalDirName}_${counter}`;
    counter++;
  }

  console.log(`Undo rename: ${workDir} -> ${newDirPath}`);

  if (!dryRun) {
    await rename(workDir, newDirPath);
  }

  if (dryRun) {
    console.log(`[dry-run] End: work::undoSetNameByBms`);
  }
}
