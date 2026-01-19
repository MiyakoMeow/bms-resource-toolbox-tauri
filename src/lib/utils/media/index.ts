/**
 * Media 处理模块导出入口
 *
 * 本模块提供音频/视频转换和媒体文件清理功能
 * 从 Rust 代码迁移至前端实现
 */

import { MediaProbe } from './probe';
import { MediaCleaner } from './cleanup';

// 类型定义
export type {
  AudioProcessParams,
  MediaCleanupParams,
  ProcessResult,
  RemoveMediaRule,
  VideoInfo,
  VideoProcessParams,
} from './types';

// 枚举（既是类型也是值）
export { AudioPreset, VideoPreset } from './types';

// 预设配置
export { AUDIO_PRESETS, MEDIA_EXT_LIST, REMOVE_MEDIA_RULES, VIDEO_PRESETS } from './presets';

// 核心工具类
export { ProcessRunner } from './processRunner';
export { ConcurrencyPool } from './concurrency';

// 功能模块
export { AudioConverter } from './audio';
export { VideoConverter } from './video';
export { MediaCleaner } from './cleanup';
export { MediaProbe } from './probe';

// 功能函数
export { transferAudio } from './audio';
export { transferVideo } from './video';

export const { getMediaInfo, getVideoInfo, getVideoSize, getMediaDuration } = MediaProbe;
export const { removeZeroSizedMediaFiles, removeUnneedMediaFiles } = MediaCleaner;
