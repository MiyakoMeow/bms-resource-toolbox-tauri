/**
 * BMS 解析器的类型定义
 */

/**
 * BMS 警告类型
 */
export enum BmsWarningType {
  PlayingError = 'PlayingError',
  PlayingWarning = 'PlayingWarning',
}

/**
 * BMS 播放错误
 */
export enum PlayingError {
  NoNotes = 'NoNotes',
}

/**
 * BMS 播放警告
 */
export enum PlayingWarning {
  NoPlayableNotes = 'NoPlayableNotes',
}

/**
 * BMS 警告
 */
export type BmsWarning =
  | { type: BmsWarningType.PlayingError; error: PlayingError }
  | { type: BmsWarningType.PlayingWarning; warning: PlayingWarning };

/**
 * BMS WAV 文件信息
 */
export interface BmsWav {
  name: string;
  path?: string;
}

/**
 * BMS BMP 文件信息
 */
export interface BmsBmp {
  name: string;
  path?: string;
}

/**
 * BMS 音乐信息
 */
export interface BmsMusicInfo {
  title?: string;
  artist?: string;
  genre?: string;
}

/**
 * BMS 数据结构
 */
export interface Bms {
  musicInfo: BmsMusicInfo;
  wav: Record<string, BmsWav>;
  bmp: Record<string, BmsBmp>;
  bpms: Record<string, number>;
}

/**
 * BMS 解析输出
 */
export interface BmsOutput {
  bms: Bms;
  warnings: BmsWarning[];
}

/**
 * BMSON 数据结构（简化版）
 */
export interface Bmson {
  info?: {
    title?: string;
    artist?: string;
    genre?: string;
  };
  sound?: Array<{
    name: string;
    file?: string;
  }>;
  bmp?: Array<{
    name: string;
    file?: string;
  }>;
  bpm?: Record<string, number>;
}
