/**
 * BMS 活动工具
 * 从 Python 代码迁移：legacy/options/bms_events.py
 */

import { BMSEvent } from '../../types/enums';

/**
 * 跳转到 BMS 活动作品目录页面
 * 对应 Python: jump_to_work_info (bms_events.py:31-78)
 *
 * @command
 * @category BMSEvent
 * @dangerous false
 * @name 跳转至作品目录
 * @description 打开浏览器跳转到BMS活动作品目录页面
 * @frontend true
 *
 * @param {BMSEvent} event - BMS 活动类型
 * @param {number[]} workIds - 作品 ID 列表（可选，为空时跳转到活动列表）
 *
 * @returns {Promise<void>}
 */
export async function jumpToWorkInfo(event: BMSEvent, workIds?: number[]): Promise<void> {
  const listUrl = getBMSEventListUrl(event);

  if (!workIds || workIds.length === 0) {
    openUrl(listUrl);
    return;
  }

  for (const workId of workIds) {
    const workUrl = getBMSEventWorkUrl(event, workId);
    openUrl(workUrl);
  }
}

/**
 * 获取 BMS 活动列表页面 URL
 *
 * @param event - BMS 活动类型
 * @returns 活动列表页面的完整 URL
 */
export function getBMSEventListUrl(event: BMSEvent): string {
  const urlMap: Record<BMSEvent, string> = {
    [BMSEvent.BOFNT]: 'https://manbow.nothing.sh/event/event.cgi?action=sp&event=142',
    [BMSEvent.BOFTT]: 'https://manbow.nothing.sh/event/event.cgi?action=sp&event=146',
    [BMSEvent.BOF21]: 'https://manbow.nothing.sh/event/event.cgi?action=sp&event=149',
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
    case BMSEvent.BOF21:
      return `https://manbow.nothing.sh/event/event.cgi?action=More_def&num=${workNum}&event=149`;
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
 * 打开 URL
 *
 * @param url - 要打开的 URL
 */
function openUrl(url: string): void {
  globalThis.open(url, '_blank');
}
