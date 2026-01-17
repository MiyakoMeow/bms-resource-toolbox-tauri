/**
 * Media 处理模块导出入口
 *
 * 本模块提供音频/视频转换和媒体文件清理功能
 * 从 Rust 代码迁移至前端实现
 */

// 类型定义
export type {
  ProcessResult,
  AudioProcessParams,
  VideoProcessParams,
  MediaCleanupParams,
  RemoveMediaRule,
  VideoInfo,
} from './types.js';

// 枚举（既是类型也是值）
export { AudioPreset, VideoPreset } from './types.js';

// 预设配置
export { AUDIO_PRESETS, VIDEO_PRESETS, REMOVE_MEDIA_RULES, MEDIA_EXT_LIST } from './presets.js';

// 核心工具类
export { ProcessRunner } from './processRunner.js';
export { ConcurrencyPool } from './concurrency.js';

// 功能模块
export { AudioConverter } from './audio.js';
export { VideoConverter } from './video.js';
export { MediaCleaner } from './cleanup.js';
export { MediaProbe } from './probe.js';
