/**
 * 目录相似度计算工具
 * 从 Python 代码迁移：legacy/fs/__init__.py
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { getFileExtension, getFileStem } from './path';

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
async function fetchDirElements(
  dir: string,
  preloadedEntries?: Awaited<ReturnType<typeof readDir>>
): Promise<DirElements> {
  const elements: DirElements = {
    files: [],
    mediaStems: new Set(),
    nonMediaStems: new Set(),
  };

  try {
    const entries = preloadedEntries ?? (await readDir(dir));

    for (const entry of entries) {
      if (entry.isDirectory) {
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
export async function bmsDirSimilarity(
  dirA: string,
  dirB: string,
  preloadedEntriesA?: Awaited<ReturnType<typeof readDir>>,
  preloadedEntriesB?: Awaited<ReturnType<typeof readDir>>
): Promise<number> {
  try {
    const [elementsA, elementsB] = await Promise.all([
      fetchDirElements(dirA, preloadedEntriesA),
      fetchDirElements(dirB, preloadedEntriesB),
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

/**
 * 字符串相似度计算（使用 Levenshtein 距离）
 *
 * @param str1 - 第一个字符串
 * @param str2 - 第二个字符串
 * @returns 相似度 (0-1)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) {
    return len2 === 0 ? 1.0 : 0.0;
  }
  if (len2 === 0) {
    return 0.0;
  }

  // 使用动态规划计算 Levenshtein 距离
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 删除
        matrix[i][j - 1] + 1, // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];

  return (maxLen - distance) / maxLen;
}

/**
 * 计算两个字符串的相似度（基于最长公共子序列）
 *
 * @param s1 - 第一个字符串
 * @param s2 - 第二个字符串
 * @returns 相似度（0-1）
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const len1 = s1.length;
  const len2 = s2.length;

  // 创建 DP 表
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 填充 DP 表
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 最长公共子序列长度
  const lcsLength = dp[len1][len2];

  // 相似度 = LCS 长度 / 最大长度
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1 : lcsLength / maxLength;
}
