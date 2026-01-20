/**
 * BMS 文件夹命名操作模块
 * 从 Python 代码迁移：legacy/options/bms_folder.py
 *
 * 提供 BMS 文件夹的命名相关操作：
 * - set_name_by_bms: 按照 BMS 信息重命名文件夹为 "Title [Artist]"
 * - append_name_by_bms: 追加 " Title [Artist]" 到文件夹名
 * - append_artist_name_by_bms: 追加 " [Artist]" 到文件夹名
 * - copy_numbered_workdir_names: 复制带编号的文件夹名
 * - scan_folder_similar_folders: 扫描相似文件夹名
 * - undo_set_name: 撤销命名操作
 */

import { readDir, rename, exists, remove } from '@tauri-apps/plugin-fs';
import { getDirBmsInfo } from './scanner';
import { getValidFsName } from '../fs/name';
import { bmsDirSimilarity } from '../fs/similarity';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '../fs/moving';

/**
 * 相似文件夹扫描结果
 */
export interface SimilarFolderResult {
  folder1: string;
  folder2: string;
  similarity: number;
}

/**
 * 扫描相似文件夹
 * 对应 Python: scan_folder_similar_folders (bms_folder.py:198-214)
 *
 * @command
 * @category bmsfolder
 * @dangerous false
 * @name 扫描相似文件夹
 * @description 扫描根目录下名称相似的文件夹
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {number} similarityTrigger - 相似度阈值（默认 0.7）
 *
 * @returns {Promise<SimilarFolderResult[]>} 相似文件夹列表
 */
export async function scanFolderSimilarFolders(
  rootDir: string,
  similarityTrigger: number = 0.7
): Promise<SimilarFolderResult[]> {
  const results: SimilarFolderResult[] = [];

  const entries = await readDir(rootDir);
  const dirNames: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory && entry.name) {
      dirNames.push(entry.name);
    }
  }

  dirNames.sort();

  for (let i = 1; i < dirNames.length; i++) {
    const formerDirName = dirNames[i - 1];
    const currentDirName = dirNames[i];

    const similarity = calculateStringSimilarity(formerDirName, currentDirName);

    if (similarity >= similarityTrigger) {
      results.push({
        folder1: formerDirName,
        folder2: currentDirName,
        similarity,
      });
    }
  }

  return results;
}

/**
 * 计算两个字符串的相似度（使用 SequenceMatcher 算法）
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;

  const longer = str1.length > str2.length ? str1 : str2;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(str1, str2);
  return (longer.length - editDistance) / longer.length;
}

/**
 * 计算编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 重命名操作结果
 */
export interface RenameOperation {
  originalName: string;
  newName: string;
  success: boolean;
  reason?: string;
}

/**
 * 按照 BMS 信息设置文件夹名称
 * 对应 Python: set_name_by_bms (bms_folder.py:89-168)
 *
 * 格式："Title [Artist]"
 * 如果目标目录已存在且相似度 >= 0.8，则合并
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 按BMS设置文件夹名
 * @description 将文件夹重命名为 "标题 [艺术家]" 格式
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<RenameOperation[]>} 重命名操作结果列表
 */
export async function setNameByBms(
  rootDir: string,
  dryRun: boolean = false
): Promise<RenameOperation[]> {
  const results: RenameOperation[] = [];
  const failList: string[] = [];

  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) continue;

    const workDir = `${rootDir}/${entry.name}`;
    const result = await workdirSetNameByBms(workDir, dryRun);

    if (result.success && result.newPath) {
      results.push({
        originalName: entry.name,
        newName: result.newName || entry.name,
        success: true,
      });
    } else {
      failList.push(entry.name);
      results.push({
        originalName: entry.name,
        newName: entry.name,
        success: false,
        reason: result.reason,
      });
    }
  }

  if (failList.length > 0) {
    console.log(`Fail Count: ${failList.length}`);
    console.log(failList);
  }

  return results;
}

/**
 * 处理单个工作目录的命名
 */
async function workdirSetNameByBms(
  workDir: string,
  dryRun: boolean
): Promise<{
  success: boolean;
  newName?: string;
  newPath?: string;
  reason?: string;
}> {
  const info = await getDirBmsInfo(workDir);

  if (!info) {
    // 尝试处理特殊情况
    const elements = await readDir(workDir);

    if (elements.length === 0) {
      console.log(`${workDir} is empty dir! Deleting...`);
      try {
        await remove(workDir, { recursive: true });
      } catch (error) {
        console.error(error);
      }
      return { success: false, reason: 'Empty directory' };
    }

    if (elements.length !== 1) {
      console.log(`Element count: ${elements.length}`);
      return { success: false, reason: 'Multiple elements' };
    }

    const innerElement = elements[0];
    if (!innerElement.isDirectory) {
      console.log(`Folder has only a file: ${innerElement.name}`);
      return { success: false, reason: 'Only file' };
    }

    const innerPath = `${workDir}/${innerElement.name}`;
    console.log('Moving out files...');
    await moveElementsAcrossDir(
      innerPath,
      workDir,
      replaceOptionsFromPreset(ReplacePreset.Default)
    );

    // 重新获取 BMS 信息
    const newInfo = await getDirBmsInfo(workDir);
    if (!newInfo) {
      return { success: false, reason: 'No BMS info after moving' };
    }

    // 使用新信息继续处理
    return processBmsInfo(newInfo, workDir, dryRun);
  }

  return processBmsInfo(info, workDir, dryRun);
}

/**
 * 处理 BMS 信息并返回新的目录路径
 */
async function processBmsInfo(
  info: NonNullable<Awaited<ReturnType<typeof getDirBmsInfo>>>,
  workDir: string,
  dryRun: boolean
): Promise<{
  success: boolean;
  newName?: string;
  newPath?: string;
  reason?: string;
}> {
  const parentDir = workDir.substring(0, workDir.lastIndexOf('/'));
  const title = info.bms.musicInfo.title ?? '';
  const artist = info.bms.musicInfo.artist ?? '';

  if (title.length === 0 && artist.length === 0) {
    console.log(`${workDir}: Info title and artist is EMPTY!`);
    return { success: false, reason: 'Empty title and artist' };
  }

  const newDirName = `${getValidFsName(title)} [${getValidFsName(artist)}]`;
  const newDirPath = `${parentDir}/${newDirName}`;

  // 相同则忽略
  if (workDir === newDirPath) {
    return { success: true, newName: newDirName, newPath: newDirPath };
  }

  console.log(`${workDir}: Rename! Title: ${title}; Artist: ${artist}`);

  // 检查目标是否存在
  const targetExists = await exists(newDirPath);

  if (!targetExists) {
    if (!dryRun) {
      await rename(workDir, newDirPath);
    }
    return { success: true, newName: newDirName, newPath: newDirPath };
  }

  // 计算相似度
  const similarity = await bmsDirSimilarity(workDir, newDirPath);
  console.log(` - Directory ${newDirPath} exists! Similarity: ${similarity}`);

  if (similarity < 0.8) {
    console.log(' - Merge canceled.');
    return { success: false, reason: 'Low similarity' };
  }

  console.log(' - Merge start!');
  if (!dryRun) {
    await moveElementsAcrossDir(
      workDir,
      newDirPath,
      replaceOptionsFromPreset(ReplacePreset.UpdatePack)
    );
  }

  return { success: true, newName: newDirName, newPath: newDirPath };
}

/**
 * 按照 BMS 信息追加文件夹名称
 * 对应 Python: append_name_by_bms (bms_folder.py:71-87)
 *
 * 格式："原名. Title [Artist]"
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 按BMS追加文件夹名
 * @description 在文件夹名后追加 ". 标题 [艺术家]"
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<RenameOperation[]>} 重命名操作结果列表
 */
export async function appendNameByBms(
  rootDir: string,
  dryRun: boolean = false
): Promise<RenameOperation[]> {
  const results: RenameOperation[] = [];
  const failList: string[] = [];

  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) continue;

    const workDir = `${rootDir}/${entry.name}`;
    const result = await workdirAppendNameByBms(workDir, dryRun);

    if (result.success && result.newPath) {
      results.push({
        originalName: entry.name,
        newName: result.newName || entry.name,
        success: true,
      });
    } else {
      failList.push(entry.name);
      results.push({
        originalName: entry.name,
        newName: entry.name,
        success: false,
        reason: result.reason,
      });
    }
  }

  if (failList.length > 0) {
    console.log(`Fail Count: ${failList.length}`);
    console.log(failList);
  }

  return results;
}

/**
 * 处理单个工作目录的追加命名
 */
async function workdirAppendNameByBms(
  workDir: string,
  dryRun: boolean
): Promise<{
  success: boolean;
  newName?: string;
  newPath?: string;
  reason?: string;
}> {
  const dirName = workDir.split(/[/\\]/).pop() || '';

  // 检查是否已经处理过（以]结尾）
  if (dirName.endsWith(']')) {
    console.log(`${workDir} has been renamed! Skipping...`);
    return { success: false, reason: 'Already renamed' };
  }

  const info = await getDirBmsInfo(workDir);

  if (!info) {
    console.log(`${workDir} has no bms/bmson files!`);
    return { success: false, reason: 'No BMS files' };
  }

  console.log(
    `${workDir} found bms title: ${info.bms.musicInfo.title} artist: ${info.bms.musicInfo.artist}`
  );

  const title = info.bms.musicInfo.title ?? '';
  const artist = info.bms.musicInfo.artist ?? '';
  const newDirPath = `${workDir}. ${getValidFsName(title)} [${getValidFsName(artist)}]`;

  if (!dryRun) {
    await rename(workDir, newDirPath);
  }

  return {
    success: true,
    newName: newDirPath.split(/[/\\]/).pop() || '',
    newPath: newDirPath,
  };
}

/**
 * 按照 BMS 信息追加艺术家名称
 * 对应 Python: append_artist_name_by_bms (bms_folder.py:12-44)
 *
 * 格式："原名 [Artist]"
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 按BMS追加艺术家名
 * @description 在文件夹名后追加 " [艺术家]"
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<RenameOperation[]>} 重命名操作结果列表
 */
export async function appendArtistNameByBms(
  rootDir: string,
  dryRun: boolean = false
): Promise<RenameOperation[]> {
  const results: RenameOperation[] = [];

  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) continue;

    const dirPath = `${rootDir}/${entry.name}`;

    // 跳过已处理的文件夹
    if (entry.name.endsWith(']')) {
      continue;
    }

    const info = await getDirBmsInfo(dirPath);

    if (!info) {
      console.log(`Dir ${dirPath} has no bms files!`);
      continue;
    }

    const artist = info.bms.musicInfo.artist ?? '';
    const newDirName = `${entry.name} [${getValidFsName(artist)}]`;
    console.log(`- Ready to rename: ${entry.name} -> ${newDirName}`);

    if (!dryRun) {
      await rename(dirPath, `${rootDir}/${newDirName}`);
    }

    results.push({
      originalName: entry.name,
      newName: newDirName,
      success: true,
    });
  }

  return results;
}

/**
 * 复制带编号的文件夹名
 * 对应 Python: copy_numbered_workdir_names (bms_folder.py:170-195)
 *
 * 场景：源目录的子文件夹名为 "1. Title [Artist]"
 * 目标目录的子文件夹名只有编号
 * 将源目录的子文件夹名同步给目标目录
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 克隆带编号的文件夹名
 * @description 将源目录的带编号文件夹名同步到目标目录
 * @frontend true
 *
 * @param {string} rootDirFrom - 源根目录路径
 * @param {string} rootDirTo - 目标根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<RenameOperation[]>} 重命名操作结果列表
 */
export async function copyNumberedWorkdirNames(
  rootDirFrom: string,
  rootDirTo: string,
  dryRun: boolean = false
): Promise<RenameOperation[]> {
  const results: RenameOperation[] = [];

  const fromEntries = await readDir(rootDirFrom);
  const srcDirNames: string[] = [];

  for (const entry of fromEntries) {
    if (entry.isDirectory && entry.name) {
      srcDirNames.push(entry.name);
    }
  }

  const toEntries = await readDir(rootDirTo);

  for (const entry of toEntries) {
    if (!entry.isDirectory || !entry.name) continue;

    const dirName = entry.name;
    const dirPath = `${rootDirTo}/${dirName}`;

    // 提取编号
    const parts = dirName.split(' ');
    const dirNum = parts[0].split('.')[0];

    if (!/^\d+$/.test(dirNum)) {
      continue;
    }

    // 在源目录中查找匹配的文件夹
    for (const srcName of srcDirNames) {
      if (srcName.startsWith(dirNum)) {
        console.log(`Rename ${dirName} to ${srcName}`);

        if (!dryRun) {
          await rename(dirPath, `${rootDirTo}/${srcName}`);
        }

        results.push({
          originalName: dirName,
          newName: srcName,
          success: true,
        });
        break;
      }
    }
  }

  return results;
}

/**
 * 撤销命名操作
 * 对应 Python: undo_set_name (bms_folder.py:217-228)
 *
 * 将 "1. Title [Artist]" 还原为 "1"
 *
 * @command
 * @category bmsfolder
 * @dangerous true
 * @name 撤销命名操作
 * @description 将命名操作还原为纯编号格式
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<RenameOperation[]>} 重命名操作结果列表
 */
export async function undoSetName(
  rootDir: string,
  dryRun: boolean = false
): Promise<RenameOperation[]> {
  const results: RenameOperation[] = [];

  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) continue;

    const dirName = entry.name;
    const dirPath = `${rootDir}/${dirName}`;

    // 提取新名称（第一个空格之前的内容）
    const parts = dirName.split(' ');
    const newDirName = parts[0];
    const newDirPath = `${rootDir}/${newDirName}`;

    if (dirName === newDirName) {
      continue;
    }

    console.log(`Rename ${dirName} to ${newDirName}`);

    if (!dryRun) {
      await rename(dirPath, newDirPath);
    }

    results.push({
      originalName: dirName,
      newName: newDirName,
      success: true,
    });
  }

  return results;
}
