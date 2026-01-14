/**
 * API 类型定义
 *
 * 定义了后端 API 返回的数据类型
 */

/**
 * BMS 音乐信息
 */
export interface BMSMusicInfo {
  title?: string;
  artist?: string;
  genre?: string;
}

/**
 * BMS 输出（解析结果）
 */
export interface BMSOutput {
  music_info: BMSMusicInfo;
  [key: string]: unknown;
}

/**
 * BMS 信息（info.toml 中的摘要信息）
 */
export interface BMS {
  music_info: BMSMusicInfo;
  [key: string]: unknown;
}

/**
 * 文件相似度结果
 */
export interface SimilarityResult {
  dir1: string;
  dir2: string;
  similarity: number;
}

/**
 * 通用命令结果
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}
