/**
 * BMS Event 工具函数
 *
 * 提供浏览器打开 BMS 活动相关页面的功能
 */

import { BMSEvent } from '$lib/types/enums.js';
import {
  executeGeneratedFrontendCommand,
  FRONTEND_COMMAND_IDS,
} from './bmsEventHelper.generated.js';

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
  return FRONTEND_COMMAND_IDS.includes(commandId);
}

/**
 * 执行前端命令（使用自动生成的路由）
 *
 * @param commandId - 命令 ID
 * @param params - 命令参数
 * @returns 命令执行结果
 */
export async function executeFrontendCommand(
  commandId: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return executeGeneratedFrontendCommand(commandId, params);
}
