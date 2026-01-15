/**
 * Pack 转换工具
 * Raw -> HQ -> LQ
 */

import { mkdir, remove } from '@tauri-apps/plugin-fs';
import { AudioConverter } from '$lib/utils/media/audio.js';
import { MediaCleaner } from '$lib/utils/media/cleanup.js';
import { AudioPreset, RemoveMediaPreset } from '$lib/utils/media/types.js';
import {
  setNameByBms,
  BmsFolderSetNameType,
} from '$lib/utils/work/rename.js';
import { ReplacePreset } from '$lib/utils/fs/moving.js';
import { copyNumberedWorkdirNames } from '$lib/utils/root/batch.js';
import { syncFolder, presetForAppend } from '$lib/utils/fs/sync.js';
import { removeEmptyFolders } from '$lib/utils/fs/cleanup.js';

/**
 * Pack 生成脚本：Raw pack -> HQ pack
 */
export async function setupRawpackToHq(
  packDir: string,
  rootDir: string
): Promise<void> {
  // Setup
  await mkdir(rootDir, { recursive: true });

  // 1. 解压包
  console.log(` > 1. Unzip packs from ${packDir} to ${rootDir}`);
  const cacheDir = `${rootDir}/CacheDir`;
  await mkdir(cacheDir, { recursive: true });

  const { unzipNumericToBmsFolder } = await import('$lib/utils/rawpack/unzip.js');
  await unzipNumericToBmsFolder(
    packDir,
    cacheDir,
    rootDir,
    false,
    ReplacePreset.UpdatePack
  );

  // 检查缓存目录是否为空，删除如果为空
  const { readDir } = await import('@tauri-apps/plugin-fs');
  const cacheEntries = await readDir(cacheDir);
  if (cacheEntries.length === 0) {
    await remove(cacheDir, { recursive: true });
  }

  // 2. 同步文件夹名称
  console.log(` > 2. Setting dir names from BMS Files`);
  const entries = await readDir(rootDir);
  for (const entry of entries) {
    if (entry.children !== undefined && entry.name) {
      const path = `${rootDir}/${entry.name}`;
      await setNameByBms(
        path,
        BmsFolderSetNameType.AppendTitleArtist,
        false,
        ReplacePreset.UpdatePack,
        true
      );
    }
  }

  // 3. 音频转换 (WAV -> FLAC) - 已迁移到前端
  console.log(` > 3. Media processing (WAV -> FLAC)`);
  await AudioConverter.processBmsFolders({
    rootDir,
    inputExtensions: ['wav'],
    presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
    removeOnSuccess: true,
    removeOnFail: true,
    skipOnFail: false,
  });

  // 4. 清理冗余媒体文件
  console.log(` > 4. Clean up redundant media files`);
  await MediaCleaner.removeUnneedMediaFiles(rootDir, RemoveMediaPreset.Oraja);
}

/**
 * Pack 更新脚本：Raw pack -> HQ pack
 */
export async function updateRawpackToHq(
  packDir: string,
  rootDir: string,
  syncDir: string
): Promise<void> {
  // Setup
  await mkdir(rootDir, { recursive: true });

  // 1. 解压包
  console.log(` > 1. Unzip packs from ${packDir} to ${rootDir}`);
  const cacheDir = `${rootDir}/CacheDir`;
  await mkdir(cacheDir, { recursive: true });

  const { unzipNumericToBmsFolder } = await import('$lib/utils/rawpack/unzip.js');
  await unzipNumericToBmsFolder(
    packDir,
    cacheDir,
    rootDir,
    false,
    ReplacePreset.UpdatePack
  );

  // 2. 同步文件夹名称
  console.log(` > 2. Syncing dir name from ${syncDir} to ${rootDir}`);
  await copyNumberedWorkdirNames(syncDir, rootDir, false);

  // 3. 音频转换 (WAV -> FLAC) - 已迁移到前端
  console.log(` > 3. Media processing (WAV -> FLAC)`);
  await AudioConverter.processBmsFolders({
    rootDir,
    inputExtensions: ['wav'],
    presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
    removeOnSuccess: true,
    removeOnFail: true,
    skipOnFail: false,
  });

  // 4. 软同步
  console.log(` > 4. Syncing dir files from ${rootDir} to ${syncDir}`);
  await syncFolder(rootDir, syncDir, presetForAppend());

  // 5. 删除空文件夹
  console.log(` > 5. Remove empty folder in ${rootDir}`);
  await removeEmptyFolders(rootDir, false);
}
