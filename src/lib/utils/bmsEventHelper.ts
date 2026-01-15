/**
 * BMS Event 工具函数
 *
 * 提供浏览器打开 BMS 活动相关页面的功能
 */

import { BMSEvent, RemoveMediaPreset } from '$lib/types/enums.js';

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
    // Media 命令
    'work_remove_zero_sized_media_files',
    'root_remove_unneed_media_files',
    'pack_raw_to_hq',
    'pack_hq_to_lq'
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
): Promise<{ success: boolean; error?: string }> {
  try {
    // BMS Event 命令
    if (commandId === 'bms_event_open_list') {
      const event = params.event as BMSEvent;
      openBMSEventList(event);
      return { success: true };
    } else if (commandId === 'bms_event_open_event_works') {
      const event = params.event as BMSEvent;
      const workIds = params.work_ids as number[];
      openBMSEventWorks(event, workIds);
      return { success: true };
    }

    // Media 命令
    if (commandId === 'work_remove_zero_sized_media_files') {
      const { MediaCleaner } = await import('$lib/utils/media/cleanup.js');
      await MediaCleaner.removeZeroSizedMediaFiles(
        params.dir as string,
        params.dry_run as boolean
      );
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
        skipOnFail: false
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
        skipOnFail: false
      });

      // 视频转换: MP4 → AVI/WMV/MPG
      await VideoConverter.processBmsFolders({
        rootDir: params.dir as string,
        inputExtensions: ['mp4'],
        presetNames: [VideoPreset.MPEG1VIDEO_512X512, VideoPreset.WMV2_512X512, VideoPreset.AVI_512X512],
        removeOriginal: true,
        removeExisting: false,
        usePreferred: false
      });

      return { success: true };
    }

    return { success: false, error: '未知的前端命令' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
