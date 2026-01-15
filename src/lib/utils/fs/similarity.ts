/**
 * 目录相似度计算工具
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { getFileExtension, getFileStem } from './path.js';

/**
 * 媒体文件扩展名列表
 */
export const MEDIA_EXT_LIST = [
  'ogg',
  'wav',
  'flac',
  'mp4',
  'wmv',
  'avi',
  'mpg',
  'mpeg',
  'bmp',
  'jpg',
  'png',
];

/**
 * 目录元素集合
 */
interface DirElements {
  files: string[];
  mediaStems: Set<string>;
  nonMediaStems: Set<string>;
}

/**
 * 获取目录元素
 */
async function fetchDirElements(dir: string): Promise<DirElements> {
  const elements: DirElements = {
    files: [],
    mediaStems: new Set(),
    nonMediaStems: new Set(),
  };

  try {
    const entries = await readDir(dir);

    for (const entry of entries) {
      if (entry.children !== undefined) {
        continue; // 跳过目录
      }

      if (!entry.name) {
        continue;
      }

      const fileStem = getFileStem(entry.name);
      const fileExt = getFileExtension(entry.name);

      if (MEDIA_EXT_LIST.includes(fileExt)) {
        elements.mediaStems.add(fileStem);
      } else {
        elements.nonMediaStems.add(fileStem);
      }

      elements.files.push(fileStem);
    }
  } catch (error) {
    console.error(`Failed to fetch directory elements: ${dir}`, error);
  }

  return elements;
}

/**
 * 计算两个 BMS 目录的相似度
 * 通过比较媒体文件名的交集来计算
 */
export async function bmsDirSimilarity(dirA: string, dirB: string): Promise<number> {
  try {
    const [elementsA, elementsB] = await Promise.all([
      fetchDirElements(dirA),
      fetchDirElements(dirB),
    ]);

    // 如果任一目录为空或没有媒体文件，返回 0
    if (
      elementsA.files.length === 0 ||
      elementsA.mediaStems.size === 0 ||
      elementsB.files.length === 0 ||
      elementsB.mediaStems.size === 0
    ) {
      return 0.0;
    }

    // 计算交集
    const intersection = new Set<string>();
    for (const stem of elementsA.mediaStems) {
      if (elementsB.mediaStems.has(stem)) {
        intersection.add(stem);
      }
    }

    // 相似度 = 交集大小 / 较小的集合大小
    const minSize = Math.min(elementsA.mediaStems.size, elementsB.mediaStems.size);
    return intersection.size / minSize;
  } catch (error) {
    console.error('Failed to calculate BMS directory similarity:', error);
    return 0.0;
  }
}
