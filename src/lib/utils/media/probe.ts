/**
 * 媒体信息提取模块
 * 从 Rust 代码迁移：src-tauri/src/media/video.rs
 *
 * 使用 ffprobe 获取音频和视频文件的详细信息
 */

import { ProcessRunner } from './processRunner';
import type { VideoInfo } from './types';

/**
 * ffprobe 输出的媒体信息结构
 */
interface FFProbeOutput {
  streams: FFProbeStream[];
  format?: {
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
}

/**
 * ffprobe 输出的流信息
 */
interface FFProbeStream {
  index: number;
  codec_type: string;
  codec_name?: string;
  width?: number;
  height?: number;
  bit_rate?: string;
  duration?: string;
}

/**
 * 媒体信息
 */
export interface MediaInfo {
  /** 视频信息（如果是视频文件） */
  video?: VideoInfo;
  /** 媒体时长（秒） */
  duration?: number;
  /** 文件大小（字节） */
  size?: number;
  /** 整体比特率 */
  bitRate?: number;
  /** 包含的流类型 */
  streamTypes: string[];
}

/**
 * 媒体信息提取器类
 */
export class MediaProbe {
  /**
   * 使用 ffprobe 获取媒体文件的完整信息
   *
   * @command
   * @category media
   * @dangerous false
   * @name 获取媒体文件信息
   * @description 使用 ffprobe 获取音频或视频文件的详细信息
   * @frontend true
   *
   * @param {string} filePath - 媒体文件路径
   * @returns {Promise<MediaInfo | null>} 媒体信息，失败时返回 null
   *
   * @example
   * ```typescript
   * const info = await MediaProbe.getMediaInfo('/path/to/video.mp4');
   * console.log(`尺寸: ${info.video?.width}x${info.video?.height}`);
   * ```
   */
  static async getMediaInfo(filePath: string): Promise<MediaInfo | null> {
    try {
      const result = await ProcessRunner.exec('ffprobe', [
        '-show_format',
        '-show_streams',
        '-print_format',
        'json',
        '-v',
        'quiet',
        filePath,
      ]);

      if (!result.success || !result.stdout) {
        return null;
      }

      const probeOutput = JSON.parse(result.stdout) as FFProbeOutput;

      // 提取基本信息
      const mediaInfo: MediaInfo = {
        streamTypes: [],
      };

      // 解析格式信息
      if (probeOutput.format) {
        if (probeOutput.format.duration) {
          mediaInfo.duration = parseFloat(probeOutput.format.duration);
        }
        if (probeOutput.format.size) {
          mediaInfo.size = parseInt(probeOutput.format.size, 10);
        }
        if (probeOutput.format.bit_rate) {
          mediaInfo.bitRate = parseInt(probeOutput.format.bit_rate, 10);
        }
      }

      // 解析流信息
      for (const stream of probeOutput.streams) {
        mediaInfo.streamTypes.push(stream.codec_type);

        if (stream.codec_type === 'video' && stream.width && stream.height) {
          mediaInfo.video = {
            width: stream.width,
            height: stream.height,
            bitRate: stream.bit_rate ? parseInt(stream.bit_rate, 10) : 0,
          };
        }
      }

      return mediaInfo;
    } catch (error) {
      console.error(`Failed to get media info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 获取视频文件的详细信息
   * 对应 Rust: get_video_info (video.py:37-48)
   *
   * @command
   * @category media
   * @dangerous false
   * @name 获取视频信息
   * @description 获取视频文件的尺寸和比特率信息
   * @frontend true
   *
   * @param {string} filePath - 视频文件路径
   * @returns {Promise<VideoInfo | null>} 视频信息，失败时返回 null
   *
   * @example
   * ```typescript
   * const info = await MediaProbe.getVideoInfo('/path/to/video.mp4');
   * if (info) {
   *   console.log(`分辨率: ${info.width}x${info.height}`);
   *   console.log(`比特率: ${info.bitRate}`);
   * }
   * ```
   */
  static async getVideoInfo(filePath: string): Promise<VideoInfo | null> {
    const mediaInfo = await this.getMediaInfo(filePath);

    if (!mediaInfo || !mediaInfo.video) {
      return null;
    }

    return mediaInfo.video;
  }

  /**
   * 获取视频文件的尺寸
   *
   * @command
   * @category media
   * @dangerous false
   * @name 获取视频尺寸
   * @description 获取视频文件的宽度和高度
   * @frontend true
   *
   * @param {string} filePath - 视频文件路径
   * @returns {Promise<{ width: number; height: number } | null>} 视频尺寸，失败时返回 null
   *
   * @example
   * ```typescript
   * const size = await MediaProbe.getVideoSize('/path/to/video.mp4');
   * if (size) {
   *   console.log(`尺寸: ${size.width}x${size.height}`);
   * }
   * ```
   */
  static async getVideoSize(filePath: string): Promise<{ width: number; height: number } | null> {
    const videoInfo = await this.getVideoInfo(filePath);

    if (!videoInfo) {
      return null;
    }

    return {
      width: videoInfo.width,
      height: videoInfo.height,
    };
  }

  /**
   * 获取媒体文件的时长（秒）
   *
   * @command
   * @category media
   * @dangerous false
   * @name 获取媒体时长
   * @description 获取音频或视频文件的时长（秒）
   * @frontend true
   *
   * @param {string} filePath - 媒体文件路径
   * @returns {Promise<number | null>} 时长（秒），失败时返回 null
   *
   * @example
   * ```typescript
   * const duration = await MediaProbe.getMediaDuration('/path/to/audio.flac');
   * if (duration !== null) {
   *   console.log(`时长: ${duration} 秒`);
   * }
   * ```
   */
  static async getMediaDuration(filePath: string): Promise<number | null> {
    const mediaInfo = await this.getMediaInfo(filePath);

    if (!mediaInfo || mediaInfo.duration === undefined) {
      return null;
    }

    return mediaInfo.duration;
  }

  /**
   * 检查文件是否为视频文件
   *
   * @param filePath - 文件路径
   * @returns 是否为视频文件
   */
  static async isVideoFile(filePath: string): Promise<boolean> {
    const mediaInfo = await this.getMediaInfo(filePath);

    if (!mediaInfo) {
      return false;
    }

    return mediaInfo.streamTypes.includes('video');
  }

  /**
   * 检查文件是否为音频文件
   *
   * @param filePath - 文件路径
   * @returns 是否为音频文件
   */
  static async isAudioFile(filePath: string): Promise<boolean> {
    const mediaInfo = await this.getMediaInfo(filePath);

    if (!mediaInfo) {
      return false;
    }

    return mediaInfo.streamTypes.includes('audio') && !mediaInfo.streamTypes.includes('video');
  }
}
