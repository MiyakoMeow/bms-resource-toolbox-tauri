/**
 * Media 处理相关类型定义
 */

/**
 * 音频预设枚举
 * 对应 Rust 侧的音频预设名称
 */
export enum AudioPreset {
  /** FLAC 格式（使用 flac 编码器） */
  FLAC = 'FLAC',
  /** FLAC 格式（使用 ffmpeg 编码器） */
  FLAC_FFMPEG = 'FLAC_FFMPEG',
  /** WAV 格式（从 FLAC 解码，使用 flac） */
  WAV_FROM_FLAC = 'WAV_FROM_FLAC',
  /** WAV 格式（使用 ffmpeg） */
  WAV_FFMPEG = 'WAV_FFMPEG',
  /** OGG 格式（质量 10，使用 oggenc） */
  OGG_Q10 = 'OGG_Q10',
  /** OGG 格式（使用 ffmpeg） */
  OGG_FFMPEG = 'OGG_FFMPEG',
}

/**
 * 视频预设枚举
 * 对应 Rust 侧的视频预设名称
 */
export enum VideoPreset {
  /** AVI 格式，512x512 分辨率 */
  AVI_512X512 = 'AVI_512X512',
  /** WMV 格式，512x512 分辨率 */
  WMV2_512X512 = 'WMV2_512X512',
  /** MPEG 格式，512x512 分辨率 */
  MPEG1VIDEO_512X512 = 'MPEG1VIDEO_512X512',
  /** AVI 格式，480p 分辨率 */
  AVI_480P = 'AVI_480P',
  /** WMV 格式，480p 分辨率 */
  WMV2_480P = 'WMV2_480P',
  /** MPEG 格式，480p 分辨率 */
  MPEG1VIDEO_480P = 'MPEG1VIDEO_480P',
}

/**
 * 进程执行结果
 */
export interface ProcessResult {
  /** 是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 退出码 */
  exitCode: number | null;
}

/**
 * 音频处理参数
 */
export interface AudioProcessParams {
  /** 根目录路径 */
  rootDir: string;
  /** 输入文件扩展名列表（如 ['wav', 'flac']） */
  inputExtensions: string[];
  /** 要尝试的预设名称列表 */
  presetNames: AudioPreset[];
  /** 成功时是否删除原文件 */
  removeOnSuccess: boolean;
  /** 失败时是否删除原文件 */
  removeOnFail: boolean;
  /** 失败时是否跳过后续处理 */
  skipOnFail: boolean;
  /** 进度管理器（可选） */
  progressManager?: IProgressManager;
}

/**
 * 视频处理参数
 */
export interface VideoProcessParams {
  /** 根目录路径 */
  rootDir: string;
  /** 输入文件扩展名列表（如 ['mp4', 'avi']） */
  inputExtensions: string[];
  /** 要尝试的预设名称列表 */
  presetNames: VideoPreset[];
  /** 成功时是否删除原文件 */
  removeOriginal: boolean;
  /** 是否删除已存在的输出文件 */
  removeExisting: boolean;
  /** 是否使用推荐预设（根据视频宽高比） */
  usePreferred: boolean;
  /** 进度管理器（可选） */
  progressManager?: IProgressManager;
}

/**
 * 媒体清理参数
 */
export interface MediaCleanupParams {
  /** 目录路径 */
  dir: string;
  /** 是否模拟运行（不实际删除） */
  dryRun: boolean;
}

/**
 * 媒体删除规则
 * [保留格式列表, 删除格式列表]
 * 例如：[['flac', 'wav'], ['ogg']] 表示如果有 flac 或 wav，就删除 ogg
 */
export type RemoveMediaRule = [string[], string[]];

/**
 * 进度管理器接口（重复定义，导入自 progress.ts）
 */
export type IProgressManager = import('../progress').IProgressManager;

/**
 * 视频信息
 */
export interface VideoInfo {
  /** 视频宽度 */
  width: number;
  /** 视频高度 */
  height: number;
  /** 比特率 */
  bitRate: number;
}
