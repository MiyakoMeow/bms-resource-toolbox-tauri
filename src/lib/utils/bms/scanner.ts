/**
 * BMS 目录扫描工具
 * 用于扫描目录中的 BMS 文件
 */

import { readDir } from '@tauri-apps/plugin-fs';
import type { BmsOutput } from './types.js';
import { BmsParser } from './parser.js';

/**
 * BMS 文件扩展名
 */
export const BMS_FILE_EXTS = ['bms', 'bme', 'bml', 'pms'] as const;
export const BMSON_FILE_EXTS = ['bmson'] as const;
export const CHART_FILE_EXTS = [...BMS_FILE_EXTS, ...BMSON_FILE_EXTS];

/**
 * 音频文件扩展名
 */
export const AUDIO_FILE_EXTS = ['flac', 'ape', 'ogg', 'wav', 'mp3'] as const;

/**
 * 视频文件扩展名
 */
export const VIDEO_FILE_EXTS = ['webm', 'mp4', 'mkv', 'avi', 'wmv', 'mpg', 'mpeg'] as const;

/**
 * 图片文件扩展名
 */
export const IMAGE_FILE_EXTS = ['webp', 'jpg', 'png', 'bmp', 'svg'] as const;

/**
 * 媒体文件扩展名
 */
export const MEDIA_FILE_EXTS = [...AUDIO_FILE_EXTS, ...VIDEO_FILE_EXTS, ...IMAGE_FILE_EXTS];

/**
 * 从文件路径获取扩展名
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * 检查文件是否为 BMS 文件
 */
export function isBmsFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return BMS_FILE_EXTS.includes(ext as any);
}

/**
 * 检查文件是否为 BMSON 文件
 */
export function isBmsonFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  return BMSON_FILE_EXTS.includes(ext as any);
}

/**
 * 检查文件是否为谱面文件（BMS 或 BMSON）
 */
export function isChartFile(filePath: string): boolean {
  return isBmsFile(filePath) || isBmsonFile(filePath);
}

/**
 * 读取并解析 BMS 文件
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 解析 BMS 文件
 * @description 解析单个 BMS 文件，提取元数据信息（标题、艺术家等）
 * @frontend true
 *
 * @param {string} filePath - BMS 文件路径
 *
 * @returns {Promise<BmsOutput | null>} 解析结果，失败时返回 null
 */
export async function readAndParseBmsFile(filePath: string): Promise<BmsOutput | null> {
  try {
    // 读取文件内容（使用 Tauri FS API）
    const { readTextFile, exists } = await import('@tauri-apps/plugin-fs');

    if (!(await exists(filePath))) {
      return null;
    }

    const content = await readTextFile(filePath);

    // 根据扩展名选择解析器
    if (isBmsonFile(filePath)) {
      return BmsParser.parseBmson(content);
    } else {
      return BmsParser.parse(content);
    }
  } catch (error) {
    console.error(`Failed to parse BMS file: ${filePath}`, error);
    return null;
  }
}

/**
 * 获取目录中的所有 BMS 文件
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 扫描目录 BMS 文件
 * @description 扫描目录，解析所有 BMS 文件
 * @frontend true
 *
 * @param {string} dirPath - 目录路径
 *
 * @returns {Promise<BmsOutput[]>} 所有解析出的 BMS 信息列表
 */
export async function getDirBmsList(dirPath: string): Promise<BmsOutput[]> {
  const bmsOutputs: BmsOutput[] = [];

  try {
    const entries = await readDir(dirPath);

    for (const entry of entries) {
      // 跳过目录
      if (entry.isDirectory) {
        continue;
      }

      // 检查是否为 BMS 或 BMSON 文件
      if (!entry.name) {
        continue;
      }

      const filePath = `${dirPath}/${entry.name}`;

      if (isChartFile(entry.name)) {
        const output = await readAndParseBmsFile(filePath);
        if (output) {
          // 过滤掉有严重错误的 BMS
          const hasCriticalError = output.warnings.some(
            (warning) =>
              warning.type === 'PlayingError' ||
              (warning.type === 'PlayingWarning' && warning.warning === 'NoPlayableNotes')
          );

          if (!hasCriticalError) {
            bmsOutputs.push(output);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to read directory: ${dirPath}`, error);
  }

  return bmsOutputs;
}

/**
 * 获取目录的 BMS 信息（整合版）
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 读取目录 BMS 信息
 * @description 从目录的 info.toml 文件读取 BMS 摘要信息
 * @frontend true
 *
 * @param {string} dirPath - BMS 工作目录路径
 *
 * @returns {Promise<BmsOutput | null>} 整合后的 BMS 信息
 */
export async function getDirBmsInfo(dirPath: string): Promise<BmsOutput | null> {
  const bmsList = await getDirBmsList(dirPath);

  if (bmsList.length === 0) {
    return null;
  }

  // 整合多个 BMS 的信息
  const bms = bmsList[0].bms;

  // 提取标题（使用第一个非空的标题）
  const titles = bmsList
    .map((output) => output.bms.musicInfo.title)
    .filter((title) => title !== undefined);

  if (titles.length > 0) {
    bms.musicInfo.title = extractWorkName(titles);
  }

  // 提取艺术家
  const artists = bmsList
    .map((output) => output.bms.musicInfo.artist)
    .filter((artist) => artist !== undefined);

  if (artists.length > 0) {
    bms.musicInfo.artist = extractWorkName(artists, [
      '/',
      ':',
      '：',
      '-',
      'obj',
      'obj.',
      'Obj',
      'Obj.',
      'OBJ',
      'OBJ.',
    ]);
  }

  // 提取流派
  const genres = bmsList
    .map((output) => output.bms.musicInfo.genre)
    .filter((genre) => genre !== undefined);

  if (genres.length > 0) {
    bms.musicInfo.genre = extractWorkName(genres);
  }

  // 合并 WAV 和 BMP
  for (const output of bmsList) {
    Object.assign(bms.wav, output.bms.wav);
    Object.assign(bms.bmp, output.bms.bmp);
  }

  return { bms, warnings: [] };
}

/**
 * 从多个名称中提取作品名称
 */
function extractWorkName(names: (string | undefined)[], removeSubstrings?: string[]): string {
  if (names.length === 0) {
    return '';
  }

  // 使用第一个名称作为基础
  let result = names[0] || '';

  // 移除指定的子字符串
  if (removeSubstrings) {
    for (const substr of removeSubstrings) {
      result = result.replaceAll(substr, ' ');
    }
  }

  // 清理多余的空格
  result = result.replaceAll(/\s+/g, ' ').trim();

  return result;
}

/**
 * 检查是否为工作目录（包含 BMS 文件的目录）
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 检查工作目录
 * @description 检查指定目录是否为有效的 BMS 工作目录
 * @frontend true
 *
 * @param {string} dirPath - 要检查的目录路径
 *
 * @returns {Promise<boolean>} 是否为工作目录
 */
export async function isWorkDir(dirPath: string): Promise<boolean> {
  try {
    const entries = await readDir(dirPath);

    for (const entry of entries) {
      // 只检查文件
      if (entry.isDirectory) {
        continue;
      }

      if (entry.name && isChartFile(entry.name)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check work directory: ${dirPath}`, error);
    return false;
  }
}

/**
 * 检查是否为根目录（包含工作目录的目录）
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 检查根目录
 * @description 检查指定目录是否为根目录（包含工作目录的目录）
 * @frontend true
 *
 * @param {string} dirPath - 要检查的目录路径
 *
 * @returns {Promise<boolean>} 是否为根目录
 */
export async function isRootDir(dirPath: string): Promise<boolean> {
  try {
    const entries = await readDir(dirPath);

    for (const entry of entries) {
      // 只检查子目录
      if (!entry.isDirectory) {
        continue;
      }

      if (entry.name) {
        const subDirPath = `${dirPath}/${entry.name}`;
        if (await isWorkDir(subDirPath)) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`Failed to check root directory: ${dirPath}`, error);
    return false;
  }
}
