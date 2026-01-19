/**
 * 原始包解压工具
 */

import { exists, mkdir, readDir, rename } from '@tauri-apps/plugin-fs';
import { ArchiveExtractor } from '../fs/archive';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '../fs/moving';

/**
 * 解压数字编号压缩包到 BMS 文件夹
 * 对应 Python: unzip_numeric_to_bms_folder (rawpack.py:13-80)
 *
 * @command
 * @category pack
 * @dangerous true
 * @name 解压编号压缩包
 * @description 将赋予编号的文件，解压或放置至指定根目录下，带对应编号的作品目录（自动处理文件夹嵌套）
 * @frontend true
 *
 * @param {string} packDir - 压缩包目录
 * @param {string} cacheDir - 缓存目录
 * @param {string} rootDir - 根目录
 * @param {boolean} confirm - 是否确认
 * @param {ReplacePreset} replacePreset - 文件替换策略
 *
 * @returns {Promise<void>}
 */
export async function unzipNumericToBmsFolder(
  packDir: string,
  cacheDir: string,
  rootDir: string,
  confirm: boolean,
  replacePreset: ReplacePreset
): Promise<void> {
  // 确保缓存目录和根目录存在
  await mkdir(cacheDir, { recursive: true });
  await mkdir(rootDir, { recursive: true });

  // 获取数字编号文件列表
  const fileNames = await getNumSetFileNames(packDir);

  for (const fileName of fileNames) {
    // 提取编号
    const match = fileName.match(/^(\d+)\s+(.+)$/);
    if (!match) {
      continue;
    }

    const [, num, _originalName] = match;
    const packFile = `${packDir}/${fileName}`;
    const workCacheDir = `${cacheDir}/${num}`;

    // 创建工作缓存目录
    await mkdir(workCacheDir, { recursive: true });

    // 解压文件
    console.log(`Extracting ${packFile} to ${workCacheDir}`);
    await ArchiveExtractor.extractAuto(packFile, workCacheDir);

    // 移出文件夹中的文件
    const success = await moveOutFilesInFolderInCacheDir(workCacheDir, replacePreset);
    if (!success) {
      console.log(`Failed to process ${packFile}, skipping`);
      continue;
    }

    // 构建目标目录名
    let targetDirName: string;
    const entries = await readDir(workCacheDir);
    const subdirs = entries.filter((e) => e.isDirectory);

    if (subdirs.length === 1 && subdirs[0].name) {
      // 如果只有一个子目录，使用该目录名
      targetDirName = `${num} ${subdirs[0].name}`;
    } else {
      // 否则使用原文件名（不含编号）
      targetDirName = `${num} ${_originalName}`;
    }

    const targetDir = `${rootDir}/${targetDirName}`;

    // 移动到根目录
    if (!(await exists(targetDir))) {
      await rename(workCacheDir, targetDir);
    } else {
      await moveElementsAcrossDir(workCacheDir, targetDir, replaceOptionsFromPreset(replacePreset));
    }
  }
}

/**
 * 解压命名压缩包到 BMS 文件夹
 * 对应 Python: unzip_with_name_to_bms_folder (rawpack.py:82-141)
 *
 * @command
 * @category pack
 * @dangerous true
 * @name 解压命名压缩包
 * @description 将文件，解压或放置至指定根目录下，对应原文件名的作品目录（自动处理文件夹嵌套）
 * @frontend true
 *
 * @param {string} packDir - 压缩包目录
 * @param {string} cacheDir - 缓存目录
 * @param {string} rootDir - 根目录
 * @param {boolean} confirm - 是否确认
 * @param {ReplacePreset} replacePreset - 文件替换策略
 *
 * @returns {Promise<void>}
 */
export async function unzipWithNameToBmsFolder(
  packDir: string,
  cacheDir: string,
  rootDir: string,
  confirm: boolean,
  replacePreset: ReplacePreset
): Promise<void> {
  // 确保缓存目录和根目录存在
  await mkdir(cacheDir, { recursive: true });
  await mkdir(rootDir, { recursive: true });

  // 获取所有压缩包文件
  const entries = await readDir(packDir);
  const packFiles = entries.filter((e) => !e.isDirectory);

  for (const entry of packFiles) {
    if (!entry.name) {
      continue;
    }

    const ext = entry.name.split('.').pop()?.toLowerCase();
    if (!['zip', '7z', 'rar'].includes(ext || '')) {
      continue;
    }

    const packFile = `${packDir}/${entry.name}`;
    const baseName = entry.name.replace(/\.[^.]+$/, '');
    const workCacheDir = `${cacheDir}/${baseName}`;

    // 创建工作缓存目录
    await mkdir(workCacheDir, { recursive: true });

    // 解压文件
    console.log(`Extracting ${packFile} to ${workCacheDir}`);
    await ArchiveExtractor.extractAuto(packFile, workCacheDir);

    // 移出文件夹中的文件
    const success = await moveOutFilesInFolderInCacheDir(workCacheDir, replacePreset);
    if (!success) {
      console.log(`Failed to process ${packFile}, skipping`);
      continue;
    }

    // 构建目标目录名
    const targetDirName = baseName;
    const targetDir = `${rootDir}/${targetDirName}`;

    // 移动到根目录
    if (!(await exists(targetDir))) {
      await rename(workCacheDir, targetDir);
    } else {
      await moveElementsAcrossDir(workCacheDir, targetDir, replaceOptionsFromPreset(replacePreset));
    }
  }
}

/**
 * 移出缓存文件夹中的文件
 * 展平嵌套的目录结构
 */
async function moveOutFilesInFolderInCacheDir(
  cacheDirPath: string,
  replacePreset: ReplacePreset
): Promise<boolean> {
  let done = false;
  let error = false;

  // 在循环外部声明计数器，用于最终检查
  let totalFolderCount = 0;
  let totalFileCount = 0;

  while (true) {
    // 每个循环开始时重置计数器
    let cacheFolderCount = 0;
    let cacheFileCount = 0;
    let innerDirName: string | null = null;

    // 重新扫描目录
    const entries = await readDir(cacheDirPath);

    for (const entry of entries) {
      if (!entry.name) {
        continue;
      }

      if (entry.isDirectory) {
        // 跳过 __MACOSX 目录
        if (entry.name === '__MACOSX') {
          const { remove } = await import('@tauri-apps/plugin-fs');
          await remove(`${cacheDirPath}/${entry.name}`, { recursive: true });
          continue;
        }

        cacheFolderCount++;
        innerDirName = entry.name;
      } else {
        cacheFileCount++;
      }
    }

    if (cacheFolderCount === 0) {
      done = true;
    }

    if (cacheFolderCount === 1 && cacheFileCount >= 10) {
      done = true;
    }

    if (cacheFolderCount > 1) {
      console.log(` !_! ${cacheDirPath}: has more than 1 folders, please do it manually.`);
      error = true;
    }

    if (done || error) {
      break;
    }

    // 移动内部目录的文件到当前层级
    if (innerDirName) {
      const innerPath = `${cacheDirPath}/${innerDirName}`;
      const innerInnerPath = `${innerPath}/${innerDirName}`;

      if (await exists(innerInnerPath)) {
        console.log(` - Renaming inner inner dir name: ${innerInnerPath}`);
        await rename(innerInnerPath, `${innerInnerPath}-rep`);
      }

      console.log(` - Moving inner files in ${innerPath} to ${cacheDirPath}`);
      await moveElementsAcrossDir(innerPath, cacheDirPath, replaceOptionsFromPreset(replacePreset));

      // 删除内部目录
      const { remove } = await import('@tauri-apps/plugin-fs');
      await remove(innerPath, { recursive: true }).catch(() => {});
    }

    // 保存计数器的值用于最终检查
    totalFolderCount = cacheFolderCount;
    totalFileCount = cacheFileCount;
  }

  if (error) {
    return false;
  }

  if (totalFolderCount === 0 && totalFileCount === 0) {
    console.log(` !_! ${cacheDirPath}: Cache is Empty!`);
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(cacheDirPath, { recursive: true });
    return false;
  }

  return true;
}

/**
 * 获取数字编号文件名列表
 */
async function getNumSetFileNames(packDir: string): Promise<string[]> {
  const res: string[] = [];
  const entries = await readDir(packDir);

  for (const entry of entries) {
    if (entry.isDirectory || !entry.name) {
      continue;
    }

    const idStr = entry.name.split(' ')[0] || '';
    if (/^\d+$/.test(idStr)) {
      res.push(entry.name);
    }
  }

  return res;
}
