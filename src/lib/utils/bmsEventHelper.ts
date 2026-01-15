/**
 * BMS Event 工具函数
 *
 * 提供浏览器打开 BMS 活动相关页面的功能
 */

import { BMSEvent, RemoveMediaPreset } from '$lib/types/enums.js';
import { type ReplacePreset } from '$lib/utils/fs/moving.js';
import { type BmsFolderSetNameType } from '$lib/utils/work/rename.js';

/**
 * 获取 BMS 活动列表页面 URL
 *
 * @param event - BMS 活动类型
 * @returns 活动列表页面的完整 URL
 */
export function getBMSEventListUrl(event: BMSEvent): string {
  const urlMap = {
    [BMSEvent.BOFNT]: 'https://manbow.nothing.sh/event/event.cgi?action=sp&event=142',
    [BMSEvent.BOFTT]: 'https://manbow.nothing.sh/event/event.cgi?action=sp&event=146',
    [BMSEvent.LetsBMSEdit]: 'https://venue.bmssearch.net/letsbmsedit',
    [BMSEvent.LetsBMSEdit2]: 'https://venue.bmssearch.net/letsbmsedit2',
    [BMSEvent.LetsBMSEdit3]: 'https://venue.bmssearch.net/letsbmsedit3',
    [BMSEvent.LetsBMSEdit4]: 'https://venue.bmssearch.net/letsbmsedit4',
  };

  return urlMap[event];
}

/**
 * 获取 BMS 活动作品详情页面 URL
 *
 * @param event - BMS 活动类型
 * @param workNum - 作品编号
 * @returns 作品详情页面的完整 URL
 */
export function getBMSEventWorkUrl(event: BMSEvent, workNum: number): string {
  switch (event) {
    case BMSEvent.BOFNT:
      return `https://manbow.nothing.sh/event/event.cgi?action=More_def&num=${workNum}&event=142`;
    case BMSEvent.BOFTT:
      return `https://manbow.nothing.sh/event/event.cgi?action=More_def&num=${workNum}&event=146`;
    case BMSEvent.LetsBMSEdit:
      return `https://venue.bmssearch.net/letsbmsedit/${workNum}`;
    case BMSEvent.LetsBMSEdit2:
      return `https://venue.bmssearch.net/letsbmsedit2/${workNum}`;
    case BMSEvent.LetsBMSEdit3:
      return `https://venue.bmssearch.net/letsbmsedit3/${workNum}`;
    case BMSEvent.LetsBMSEdit4:
      return `https://venue.bmssearch.net/letsbmsedit4/${workNum}`;
  }
}

/**
 * 打开 BMS 活动列表页面
 *
 * @param event - BMS 活动类型
 */
export function openBMSEventList(event: BMSEvent): void {
  const url = getBMSEventListUrl(event);
  window.open(url, '_blank');
}

/**
 * 批量打开 BMS 活动作品详情页面
 *
 * @param event - BMS 活动类型
 * @param workIds - 作品 ID 列表
 */
export function openBMSEventWorks(event: BMSEvent, workIds: number[]): void {
  for (const workId of workIds) {
    const url = getBMSEventWorkUrl(event, workId);
    window.open(url, '_blank');
  }
}

/**
 * 判断命令是否为前端命令（不需要调用 Tauri 后端）
 *
 * @param commandId - 命令 ID
 * @returns 是否为前端命令
 */
export function isFrontendCommand(commandId: string): boolean {
  return [
    'bms_event_open_list',
    'bms_event_open_event_works',
    // BMS 命令
    'parse_bms_file',
    'parse_bmson_file',
    'get_dir_bms_list',
    'get_dir_bms_info',
    'is_work_dir',
    'is_root_dir',
    // FS 命令
    'is_file_same_content',
    'is_dir_having_file',
    'remove_empty_folders',
    'bms_dir_similarity',
    // Work 命令
    'work_set_name_by_bms',
    'work_undo_set_name_by_bms',
    // Root 命令
    'root_set_name_by_bms',
    'root_undo_set_name_by_bms',
    'root_copy_numbered_workdir_names',
    'root_scan_folder_similar_folders',
    // Rawpack 命令
    'rawpack_unzip_numeric_to_bms_folder',
    'rawpack_unzip_with_name_to_bms_folder',
    // Pack 命令
    'pack_setup_rawpack_to_hq',
    'pack_update_rawpack_to_hq',
    // Bigpack 命令
    'root_split_folders_with_first_char',
    'root_undo_split_pack',
    'root_merge_split_folders',
    'root_move_works_in_pack',
    'root_move_out_works',
    'root_move_works_with_same_name',
    // RootEvent 命令
    'root_event_check_num_folder',
    'root_event_create_num_folders',
    'root_event_generate_work_info_table',
    // Media 命令
    'work_remove_zero_sized_media_files',
    'root_remove_unneed_media_files',
    'pack_raw_to_hq',
    'pack_hq_to_lq',
  ].includes(commandId);
}

/**
 * 执行前端命令
 *
 * @param commandId - 命令 ID
 * @param params - 命令参数
 * @returns 命令执行结果
 */
export async function executeFrontendCommand(
  commandId: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    // ========== BMS 命令 ==========
    if (commandId === 'parse_bms_file') {
      const { readAndParseBmsFile } = await import('$lib/utils/bms/scanner.js');
      const result = await readAndParseBmsFile(params.file as string);
      return { success: true, data: result };
    }

    if (commandId === 'parse_bmson_file') {
      const { readAndParseBmsFile } = await import('$lib/utils/bms/scanner.js');
      const result = await readAndParseBmsFile(params.file as string);
      return { success: true, data: result };
    }

    if (commandId === 'get_dir_bms_list') {
      const { getDirBmsList } = await import('$lib/utils/bms/scanner.js');
      const result = await getDirBmsList(params.dir as string);
      return { success: true, data: result };
    }

    if (commandId === 'get_dir_bms_info') {
      const { getDirBmsInfo } = await import('$lib/utils/bms/scanner.js');
      const result = await getDirBmsInfo(params.dir as string);
      return { success: true, data: result };
    }

    if (commandId === 'is_work_dir') {
      const { isWorkDir } = await import('$lib/utils/bms/scanner.js');
      const result = await isWorkDir(params.dir as string);
      return { success: true, data: result };
    }

    if (commandId === 'is_root_dir') {
      const { isRootDir } = await import('$lib/utils/bms/scanner.js');
      const result = await isRootDir(params.dir as string);
      return { success: true, data: result };
    }

    // ========== FS 命令 ==========
    if (commandId === 'is_file_same_content') {
      const { isFileSameContent } = await import('$lib/utils/fs/compare.js');
      const result = await isFileSameContent(params.file1 as string, params.file2 as string);
      return { success: true, data: result };
    }

    if (commandId === 'is_dir_having_file') {
      const { isDirHavingFile } = await import('$lib/utils/fs/compare.js');
      const result = await isDirHavingFile(params.dir as string);
      return { success: true, data: result };
    }

    if (commandId === 'remove_empty_folders') {
      const { removeEmptyFolders } = await import('$lib/utils/fs/cleanup.js');
      await removeEmptyFolders(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    if (commandId === 'bms_dir_similarity') {
      const { bmsDirSimilarity } = await import('$lib/utils/fs/similarity.js');
      const result = await bmsDirSimilarity(params.dir1 as string, params.dir2 as string);
      return { success: true, data: result };
    }

    // ========== Work 命令 ==========
    if (commandId === 'work_set_name_by_bms') {
      const { setNameByBms } = await import('$lib/utils/work/rename.js');
      await setNameByBms(
        params.dir as string,
        params.set_type as BmsFolderSetNameType,
        params.dry_run as boolean,
        params.replace as ReplacePreset,
        params.skip_already_formatted as boolean
      );
      return { success: true };
    }

    if (commandId === 'work_undo_set_name_by_bms') {
      const { undoSetNameByBms } = await import('$lib/utils/work/rename.js');
      await undoSetNameByBms(
        params.dir as string,
        params.set_type as BmsFolderSetNameType,
        params.dry_run as boolean
      );
      return { success: true };
    }

    // ========== Root 命令 ==========
    if (commandId === 'root_set_name_by_bms') {
      const { rootSetNameByBms } = await import('$lib/utils/root/batch.js');
      await rootSetNameByBms(
        params.dir as string,
        params.set_type as BmsFolderSetNameType,
        params.dry_run as boolean,
        params.replace as ReplacePreset
      );
      return { success: true };
    }

    if (commandId === 'root_undo_set_name_by_bms') {
      const { rootUndoSetNameByBms } = await import('$lib/utils/root/batch.js');
      await rootUndoSetNameByBms(
        params.dir as string,
        params.set_type as BmsFolderSetNameType,
        params.dry_run as boolean
      );
      return { success: true };
    }

    if (commandId === 'root_copy_numbered_workdir_names') {
      const { copyNumberedWorkdirNames } = await import('$lib/utils/root/batch.js');
      await copyNumberedWorkdirNames(
        params.from_dir as string,
        params.to_dir as string,
        params.dry_run as boolean
      );
      return { success: true };
    }

    if (commandId === 'root_scan_folder_similar_folders') {
      const { scanFolderSimilarFolders } = await import('$lib/utils/root/similarity.js');
      const result = await scanFolderSimilarFolders(
        params.dir as string,
        params.similarity as number
      );
      return { success: true, data: result };
    }

    // ========== Rawpack 命令 ==========
    if (commandId === 'rawpack_unzip_numeric_to_bms_folder') {
      const { unzipNumericToBmsFolder } = await import('$lib/utils/rawpack/unzip.js');
      await unzipNumericToBmsFolder(
        params.pack_dir as string,
        params.cache_dir as string,
        params.root_dir as string,
        params.confirm as boolean,
        params.replace as ReplacePreset
      );
      return { success: true };
    }

    if (commandId === 'rawpack_unzip_with_name_to_bms_folder') {
      const { unzipWithNameToBmsFolder } = await import('$lib/utils/rawpack/unzip.js');
      await unzipWithNameToBmsFolder(
        params.pack_dir as string,
        params.cache_dir as string,
        params.root_dir as string,
        params.confirm as boolean,
        params.replace as ReplacePreset
      );
      return { success: true };
    }

    // ========== Pack 命令 ==========
    if (commandId === 'pack_setup_rawpack_to_hq') {
      const { setupRawpackToHq } = await import('$lib/utils/pack/pack.js');
      await setupRawpackToHq(params.pack_dir as string, params.root_dir as string);
      return { success: true };
    }

    if (commandId === 'pack_update_rawpack_to_hq') {
      const { updateRawpackToHq } = await import('$lib/utils/pack/pack.js');
      await updateRawpackToHq(
        params.pack_dir as string,
        params.root_dir as string,
        params.sync_dir as string
      );
      return { success: true };
    }

    // ========== Bigpack 命令 ==========
    if (commandId === 'root_split_folders_with_first_char') {
      const { splitFoldersWithFirstChar } = await import('$lib/utils/bigpack/split.js');
      await splitFoldersWithFirstChar(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    if (commandId === 'root_undo_split_pack') {
      const { undoSplitPack } = await import('$lib/utils/bigpack/split.js');
      await undoSplitPack(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    if (commandId === 'root_merge_split_folders') {
      const { mergeSplitFolders } = await import('$lib/utils/bigpack/split.js');
      await mergeSplitFolders(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    if (commandId === 'root_move_works_in_pack') {
      const { moveWorksInPack } = await import('$lib/utils/bigpack/split.js');
      await moveWorksInPack(
        params.dir as string,
        params.target_pack_name as string,
        params.dry_run as boolean
      );
      return { success: true };
    }

    if (commandId === 'root_move_out_works') {
      const { moveOutWorks } = await import('$lib/utils/bigpack/split.js');
      await moveOutWorks(
        params.dir as string,
        params.source_pack_name as string,
        params.dry_run as boolean
      );
      return { success: true };
    }

    if (commandId === 'root_move_works_with_same_name') {
      const { moveWorksWithSameName } = await import('$lib/utils/bigpack/split.js');
      await moveWorksWithSameName(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    // ========== RootEvent 命令 ==========
    if (commandId === 'root_event_check_num_folder') {
      const { checkNumFolder } = await import('$lib/utils/event/folder.js');
      const result = await checkNumFolder(params.dir as string, params.max as number);
      return { success: true, data: result };
    }

    if (commandId === 'root_event_create_num_folders') {
      const { createNumFolders } = await import('$lib/utils/event/folder.js');
      await createNumFolders(params.dir as string, params.max as number);
      return { success: true };
    }

    if (commandId === 'root_event_generate_work_info_table') {
      const { generateWorkInfoTable } = await import('$lib/utils/event/folder.js');
      const result = await generateWorkInfoTable(params.dir as string);
      return { success: true, data: result };
    }

    // ========== BMS Event 命令 ==========
    if (commandId === 'bms_event_open_list') {
      const event = params.event as BMSEvent;
      openBMSEventList(event);
      return { success: true };
    }

    if (commandId === 'bms_event_open_event_works') {
      const event = params.event as BMSEvent;
      const workIds = params.work_ids as number[];
      openBMSEventWorks(event, workIds);
      return { success: true };
    }

    // ========== Media 命令 ==========
    if (commandId === 'work_remove_zero_sized_media_files') {
      const { MediaCleaner } = await import('$lib/utils/media/cleanup.js');
      await MediaCleaner.removeZeroSizedMediaFiles(params.dir as string, params.dry_run as boolean);
      return { success: true };
    }

    if (commandId === 'root_remove_unneed_media_files') {
      const { MediaCleaner } = await import('$lib/utils/media/cleanup.js');
      await MediaCleaner.removeUnneedMediaFiles(
        params.dir as string,
        params.rule as RemoveMediaPreset
      );
      return { success: true };
    }

    if (commandId === 'pack_raw_to_hq') {
      // 组合音频转换和清理功能
      const { AudioConverter } = await import('$lib/utils/media/audio.js');
      const { MediaCleaner } = await import('$lib/utils/media/cleanup.js');
      const { AudioPreset } = await import('$lib/utils/media/types.js');

      await AudioConverter.processBmsFolders({
        rootDir: params.dir as string,
        inputExtensions: ['wav'],
        presetNames: [AudioPreset.FLAC, AudioPreset.FLAC_FFMPEG],
        removeOnSuccess: true,
        removeOnFail: true,
        skipOnFail: false,
      });

      await MediaCleaner.removeUnneedMediaFiles(params.dir as string, RemoveMediaPreset.Oraja);

      return { success: true };
    }

    if (commandId === 'pack_hq_to_lq') {
      // FLAC → OGG, MP4 → AVI/WMV/MPG
      const { AudioConverter } = await import('$lib/utils/media/audio.js');
      const { VideoConverter } = await import('$lib/utils/media/video.js');
      const { AudioPreset, VideoPreset } = await import('$lib/utils/media/types.js');

      // 音频转换: FLAC → OGG
      await AudioConverter.processBmsFolders({
        rootDir: params.dir as string,
        inputExtensions: ['flac'],
        presetNames: [AudioPreset.OGG_Q10],
        removeOnSuccess: true,
        removeOnFail: false,
        skipOnFail: false,
      });

      // 视频转换: MP4 → AVI/WMV/MPG
      await VideoConverter.processBmsFolders({
        rootDir: params.dir as string,
        inputExtensions: ['mp4'],
        presetNames: [
          VideoPreset.MPEG1VIDEO_512X512,
          VideoPreset.WMV2_512X512,
          VideoPreset.AVI_512X512,
        ],
        removeOriginal: true,
        removeExisting: false,
        usePreferred: false,
      });

      return { success: true };
    }

    return { success: false, error: '未知的前端命令' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
