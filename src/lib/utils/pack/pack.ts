/**
 * Pack 转换工具
 * Raw -> HQ -> LQ
 */

import { mkdir, readDir, remove } from '@tauri-apps/plugin-fs';
import { AudioConverter } from '../media/audio';
import { MediaCleaner } from '../media/cleanup';
import { VideoConverter } from '../media/video';
import { RemoveMediaPreset } from '../../types/enums';
import { BmsFolderSetNameType, setNameByBms } from '../work/rename';
import { ReplacePreset } from '../fs/moving';
import { copyNumberedWorkdirNames } from '../root/batch';
import { presetForAppend, syncFolder } from '../fs/sync';
import { removeEmptyFolders } from '../fs/cleanup';
import { AudioPreset, VideoPreset } from '../media/types';
import type { IProgressManager } from '../progress';
import { unzipNumericToBmsFolder } from '../rawpack/unzip';

/**
 * Pack 生成脚本：Raw pack -> HQ pack
 * 对应 Python: pack_setup_rawpack_to_hq (scripts/pack.py:101-136)
 *
 * @command
 * @category pack
 * @dangerous true
 * @name 大包生成脚本：原包 -> HQ版大包
 * @description 快速创建大包，从已编号的原始包到目标BMS文件夹
 * @frontend true
 *
 * @param {string} packDir - 压缩包目录路径
 * @param {string} rootDir - 目标根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @returns {Promise<void>}
 */
export async function setupRawpackToHq(
  packDir: string,
  rootDir: string,
  dryRun: boolean
): Promise<void> {
  // Setup
  if (!dryRun) {
    await mkdir(rootDir, { recursive: true });
  } else {
    console.log('[dry-run] Would create directory:', rootDir);
  }

  // 1. 解压包
  console.log(` > 1. Unzip packs from ${packDir} to ${rootDir}`);
  const cacheDir = `${rootDir}/CacheDir`;
  if (!dryRun) {
    await mkdir(cacheDir, { recursive: true });
  }

  if (!dryRun) {
    await unzipNumericToBmsFolder(packDir, cacheDir, rootDir, false, ReplacePreset.UpdatePack);
  } else {
    console.log('[dry-run] Would unzip packs from', packDir, 'to', rootDir);
  }

  // 检查缓存目录是否为空，删除如果为空
  if (!dryRun) {
    const cacheEntries = await readDir(cacheDir);
    if (cacheEntries.length === 0) {
      await remove(cacheDir, { recursive: true });
    }
  }

  // 2. 同步文件夹名称
  console.log(` > 2. Setting dir names from BMS Files`);
  if (!dryRun) {
    const entries = await readDir(rootDir);
    for (const entry of entries) {
      if (entry.isDirectory && entry.name) {
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
  } else {
    console.log('[dry-run] Would set dir names from BMS files in', rootDir);
  }

  // 3. 音频转换 (WAV -> FLAC)
  console.log(` > 3. Media processing (WAV -> FLAC)`);
  if (!dryRun) {
    await AudioConverter.processBmsFolders({
      rootDir,
      inputExtensions: ['wav'],
      presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
      removeOnSuccess: true,
      removeOnFail: true,
      skipOnFail: false,
    });
  } else {
    console.log('[dry-run] Would convert WAV to FLAC in', rootDir);
  }

  // 4. 清理冗余媒体文件
  console.log(` > 4. Clean up redundant media files`);
  if (!dryRun) {
    await MediaCleaner.removeUnneedMediaFiles(rootDir, RemoveMediaPreset.Oraja);
  } else {
    console.log('[dry-run] Would clean up redundant media files in', rootDir);
  }
}

/**
 * Pack 更新脚本：Raw pack -> HQ pack
 * 对应 Python: pack_update_rawpack_to_hq (scripts/pack.py:164-202)
 *
 * @command
 * @category pack
 * @dangerous true
 * @name 大包更新脚本：原包 -> HQ版大包
 * @description 快速更新大包，从已编号的原始包到增量BMS文件夹
 * @frontend true
 *
 * @param {string} packDir - 压缩包目录路径
 * @param {string} rootDir - 增量根目录路径
 * @param {string} syncDir - 已存在的BMS文件夹路径（用于名称同步和文件检查）
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @returns {Promise<void>}
 */
export async function updateRawpackToHq(
  packDir: string,
  rootDir: string,
  syncDir: string,
  dryRun: boolean
): Promise<void> {
  // Setup
  if (!dryRun) {
    await mkdir(rootDir, { recursive: true });
  } else {
    console.log('[dry-run] Would create directory:', rootDir);
  }

  // 1. 解压包
  console.log(` > 1. Unzip packs from ${packDir} to ${rootDir}`);
  const cacheDir = `${rootDir}/CacheDir`;
  if (!dryRun) {
    await mkdir(cacheDir, { recursive: true });
  }

  if (!dryRun) {
    await unzipNumericToBmsFolder(packDir, cacheDir, rootDir, false, ReplacePreset.UpdatePack);
  } else {
    console.log('[dry-run] Would unzip packs from', packDir, 'to', rootDir);
  }

  // 2. 同步文件夹名称
  console.log(` > 2. Syncing dir name from ${syncDir} to ${rootDir}`);
  if (!dryRun) {
    await copyNumberedWorkdirNames(syncDir, rootDir, false);
  } else {
    console.log('[dry-run] Would copy numbered directory names from', syncDir, 'to', rootDir);
  }

  // 3. 音频转换 (WAV -> FLAC)
  console.log(` > 3. Media processing (WAV -> FLAC)`);
  if (!dryRun) {
    await AudioConverter.processBmsFolders({
      rootDir,
      inputExtensions: ['wav'],
      presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
      removeOnSuccess: true,
      removeOnFail: true,
      skipOnFail: false,
    });
  } else {
    console.log('[dry-run] Would convert WAV to FLAC in', rootDir);
  }

  // 4. 清理冗余媒体文件
  console.log(` > 4. Clean up redundant media files`);
  if (!dryRun) {
    await MediaCleaner.removeUnneedMediaFiles(rootDir, RemoveMediaPreset.Oraja);
  } else {
    console.log('[dry-run] Would clean up redundant media files in', rootDir);
  }

  // 5. 软同步
  console.log(` > 5. Syncing dir files from ${rootDir} to ${syncDir}`);
  if (!dryRun) {
    await syncFolder(rootDir, syncDir, presetForAppend());
  } else {
    console.log('[dry-run] Would sync files from', rootDir, 'to', syncDir);
  }

  // 6. 删除空文件夹
  console.log(` > 6. Remove empty folder in ${rootDir}`);
  if (!dryRun) {
    await removeEmptyFolders(rootDir, false);
  } else {
    console.log('[dry-run] Would remove empty folders in', rootDir);
  }
}

/**
 * Pack 转换脚本：HQ pack -> LQ pack
 * 对应 Python: pack_hq_to_lq (scripts/pack.py:55-79)
 *
 * @command
 * @category pack
 * @dangerous true
 * @name HQ 版本转 LQ 版本
 * @description 将 HQ 版本转换为 LQ 版本，用于 LR2 玩家
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @returns {Promise<void>}
 */
export async function packHqToLq(
  rootDir: string,
  dryRun: boolean,
  progressManager?: IProgressManager
): Promise<void> {
  // 启动进度管理器
  progressManager?.start();

  try {
    // 1. 音频转换 (FLAC -> OGG)
    console.log(' > 1. Audio conversion: FLAC -> OGG');
    progressManager?.setMessage('音频转换: FLAC -> OGG');

    await AudioConverter.processBmsFolders({
      rootDir,
      inputExtensions: ['flac'],
      presetNames: [AudioPreset.OGG_Q10],
      removeOnSuccess: true,
      removeOnFail: false,
      skipOnFail: false,
      progressManager,
    });

    // 2. 视频转换 (MP4 -> MPEG)
    console.log(' > 2. Video conversion: MP4 -> MPEG');
    progressManager?.setMessage('视频转换: MP4 -> MPEG');

    await VideoConverter.processBmsFolders({
      rootDir,
      inputExtensions: ['mp4'],
      presetNames: [
        VideoPreset.MPEG1VIDEO_512X512,
        VideoPreset.WMV2_512X512,
        VideoPreset.AVI_512X512,
      ],
      removeOriginal: true,
      removeExisting: true,
      usePreferred: false,
      progressManager,
    });

    // 3. 清理冗余媒体文件
    console.log(' > 3. Cleaning up redundant media files');
    progressManager?.setMessage('清理冗余媒体文件');

    if (!dryRun) {
      await MediaCleaner.removeUnneedMediaFiles(rootDir, RemoveMediaPreset.Oraja);
    } else {
      console.log('[dry-run] Would clean up redundant media files');
    }

    // 完成
    progressManager?.update(100, 100, 'HQ -> LQ 转换完成');
    console.log('HQ -> LQ conversion completed successfully');
  } catch (error) {
    progressManager?.reportError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * BMS大包脚本：Raw -> HQ
 * 对应 Python: pack_raw_to_hq (scripts/pack.py:35-52)
 * 该函数用于将Raw版本转换为HQ版本，适用于beatoraja/Qwilight玩家
 *
 * @command
 * @category pack
 * @dangerous true
 * @name BMS大包脚本：原包 -> HQ版大包
 * @description 将Raw版本转换为HQ版本，用于beatoraja/Qwilight玩家
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 * @param {IProgressManager} progressManager - 进度管理器（可选）
 * @returns {Promise<void>}
 */
export async function packRawToHq(
  rootDir: string,
  dryRun: boolean,
  progressManager?: IProgressManager
): Promise<void> {
  progressManager?.start();

  try {
    // 1. 音频转换 (WAV -> FLAC)
    console.log(' > 1. Audio conversion: WAV -> FLAC');
    progressManager?.setMessage('音频转换: WAV -> FLAC');

    if (!dryRun) {
      await AudioConverter.processBmsFolders({
        rootDir,
        inputExtensions: ['wav'],
        presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
        removeOnSuccess: true,
        removeOnFail: true,
        skipOnFail: false,
        progressManager,
      });
    } else {
      console.log('[dry-run] Would convert WAV to FLAC in', rootDir);
    }

    // 2. 清理冗余媒体文件
    console.log(' > 2. Clean up redundant media files');
    progressManager?.setMessage('清理冗余媒体文件');

    if (!dryRun) {
      await MediaCleaner.removeUnneedMediaFiles(rootDir, RemoveMediaPreset.Oraja);
    } else {
      console.log('[dry-run] Would clean up redundant media files in', rootDir);
    }

    progressManager?.update(100, 100, 'Raw -> HQ 转换完成');
    console.log('Raw -> HQ conversion completed successfully');
  } catch (error) {
    progressManager?.reportError(error instanceof Error ? error.message : String(error));
    throw error;
  }
}
