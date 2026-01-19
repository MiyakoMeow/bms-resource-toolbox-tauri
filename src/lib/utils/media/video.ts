/**
 * 视频转换模块
 * 从 Rust 代码迁移：src-tauri/src/media/video.rs
 */

import * as fs from '@tauri-apps/plugin-fs';
import { ProcessRunner } from './processRunner';
import { ConcurrencyPool } from './concurrency';
import { VIDEO_PRESETS } from './presets';
import type { VideoInfo, VideoPreset, VideoProcessParams } from './types';
import type { IProgressManager } from '../progress';
import { VIDEO_FILE_EXTS } from '../bms/scanner';

/**
 * 视频转换器类
 */
export class VideoConverter {
  /**
   * 批量处理 BMS 文件夹
   * 对应 Rust: process_bms_video_folders (video.rs:448-490)
   *
   * @param params - 视频处理参数
   * @throws 如果目录操作或视频处理失败
   */
  static async processBmsFolders(params: VideoProcessParams): Promise<void> {
    const {
      rootDir,
      inputExtensions,
      presetNames,
      removeOriginal,
      removeExisting,
      usePreferred,
      progressManager,
    } = params;

    // 启动进度管理器
    progressManager?.start();

    try {
      // 验证预设名称
      for (const name of presetNames) {
        const presetName = typeof name === 'string' ? name : String(name);
        if (!VIDEO_PRESETS[presetName]) {
          throw new Error(`Invalid preset name: ${presetName}`);
        }
      }

      // 遍历根目录下的所有子目录
      const entries = await fs.readDir(rootDir);
      const folders = [];

      for (const entry of entries) {
        // 检查是否是目录
        const entryPath = `${rootDir}/${entry.name}`;
        let isDir = false;
        try {
          const metadata = await fs.stat(entryPath);
          isDir = metadata.isDirectory ?? false;
        } catch {
          continue;
        }

        if (!isDir) continue;

        folders.push({
          name: entry.name,
          path: entryPath,
        });
      }

      // 更新总进度
      progressManager?.update(0, folders.length, `找到 ${folders.length} 个文件夹`);

      for (let i = 0; i < folders.length; i++) {
        // 检查是否应该停止（暂停或取消）
        if (progressManager?.shouldStop()) {
          if (progressManager.getProgress().cancelled) {
            console.log('任务已取消');
            return;
          }
          // 等待恢复
          await progressManager.waitForResume();
        }

        const folder = folders[i];
        const dirPath = folder.path;

        progressManager?.update(i, folders.length, `处理 ${folder.name}`);

        console.log(`Processing BMS folder: ${dirPath}`);

        try {
          const success = await this.convertInDirectory(
            dirPath,
            inputExtensions,
            presetNames.map((n) => (typeof n === 'string' ? n : String(n))),
            removeOriginal,
            removeExisting,
            usePreferred,
            progressManager
          );

          if (success) {
            console.log(`Successfully processed ${dirPath}`);
          } else {
            console.error(`Errors occurred in ${dirPath}`);
          }
        } catch (error) {
          console.error(`Error processing ${dirPath}:`, error);
          // 遇到错误时跳过，不抛出异常
        }
      }

      // 完成
      progressManager?.update(folders.length, folders.length, '视频转换完成');
    } catch (error) {
      progressManager?.reportError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 处理单个目录下的视频文件
   * 对应 Rust: process_videos_in_directory (video.rs:313-433)
   *
   * @param dirPath - 目录路径
   * @param inputExtensions - 输入文件扩展名列表
   * @param presetNames - 预设名称列表
   * @param removeOriginal - 成功时是否删除原文件
   * @param removeExisting - 是否删除已存在的输出文件
   * @param usePreferred - 是否使用推荐预设
   * @param progressManager - 进度管理器（可选）
   * @returns 是否成功
   */
  static async convertInDirectory(
    dirPath: string,
    inputExtensions: string[],
    presetNames: string[],
    removeOriginal: boolean,
    removeExisting: boolean,
    usePreferred: boolean,
    progressManager?: IProgressManager
  ): Promise<boolean> {
    // 预检查可执行文件是否存在
    await this.checkExecutables(presetNames);

    // 收集需要处理的文件
    const files = await this.collectFiles(dirPath, inputExtensions);

    const hadError = { value: false };

    // 使用并发池处理文件
    const pool = new ConcurrencyPool(64);

    for (const filePath of files) {
      // 检查是否应该停止（暂停或取消）
      if (progressManager?.shouldStop()) {
        if (progressManager.getProgress().cancelled) {
          console.log('转换已取消');
          break;
        }
        // 等待恢复
        await progressManager.waitForResume();
      }

      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      progressManager?.setMessage(`转换 ${fileName}`);

      await pool.add(async () => {
        console.log(`Processing video: ${filePath}`);

        // 选择预设
        let presetsToTry = presetNames;
        if (usePreferred) {
          try {
            const preferred = await this.getPreferredPresets(filePath);
            presetsToTry = [...preferred, ...presetNames];
          } catch (error) {
            console.error(`Failed to get preferred presets: ${error}`);
          }
        }

        let success = false;
        for (const presetName of presetsToTry) {
          const preset = VIDEO_PRESETS[presetName];
          if (!preset) continue;

          const outputPath = this.replaceExtension(filePath, preset.outputExt);

          // 跳过相同路径
          if (filePath === outputPath) continue;

          // 检查输出文件是否存在
          const outputExists = await this.fileExists(outputPath);
          if (outputExists) {
            if (removeExisting) {
              try {
                await fs.remove(outputPath);
              } catch (error) {
                console.error(`Failed to remove existing file: ${outputPath}`, error);
              }
            } else {
              console.log(`Output file exists, skipping: ${outputPath}`);
              continue;
            }
          }

          // 构建命令
          const args = this.buildCommandArgs(filePath, outputPath, preset);
          console.log(`Executing: ${preset.executor} ${args.join(' ')}`);

          const result = await ProcessRunner.exec(preset.executor, args);

          if (result.success) {
            console.log(`Successfully converted: ${outputPath}`);
            success = true;
            if (removeOriginal) {
              try {
                await fs.remove(filePath);
              } catch (error) {
                console.error(`Failed to remove original file: ${filePath}`, error);
              }
            }
            break;
          } else {
            console.error(`Conversion failed for preset ${presetName}: ${result.stderr}`);
            // 删除失败的输出文件
            if (await this.fileExists(outputPath)) {
              try {
                await fs.remove(outputPath);
              } catch (error) {
                console.error(`Failed to remove failed output: ${outputPath}`, error);
              }
            }
          }
        }

        if (!success) {
          hadError.value = true;
          console.error(`All presets failed for: ${filePath}`);
        }
      });
    }

    // 等待所有任务完成
    await pool.drain();

    return !hadError.value;
  }

  /**
   * 获取视频信息
   * 对应 Rust: get_video_info (video.rs:238-266)
   *
   * @param filePath - 视频文件路径
   * @returns 视频信息
   * @throws 如果无法获取视频信息
   */
  static async getVideoInfo(filePath: string): Promise<VideoInfo> {
    // 检查 ffprobe 是否可用
    const ffprobeExists = await ProcessRunner.checkExecutable('ffprobe');
    if (!ffprobeExists) {
      throw new Error('Executable not found: ffprobe');
    }

    const args = [
      '-show_format',
      '-show_streams',
      '-print_format',
      'json',
      '-v',
      'quiet',
      filePath,
    ];

    const result = await ProcessRunner.exec('ffprobe', args);

    if (!result.success) {
      throw new Error(`ffprobe failed: ${result.stderr}`);
    }

    try {
      const probe = JSON.parse(result.stdout);

      for (const stream of probe.streams) {
        if (stream.codec_type === 'video') {
          const width = stream.width;
          const height = stream.height;
          if (!width || !height) {
            throw new Error('Missing width or height in video stream');
          }

          // 解析比特率
          const bitRate = stream.bit_rate ? parseInt(stream.bit_rate, 10) : 0;

          return { width, height, bitRate };
        }
      }

      throw new Error('No video stream found in file');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse ffprobe JSON');
    }
  }

  /**
   * 根据视频宽高比获取推荐的预设
   * 对应 Rust: get_preferred_presets (video.rs:287-299)
   *
   * @param filePath - 视频文件路径
   * @returns 推荐的预设名称列表
   */
  static async getPreferredPresets(filePath: string): Promise<string[]> {
    const info = await this.getVideoInfo(filePath);
    const aspectRatio = info.width / info.height;
    const targetAspect = 640 / 480; // 标准 480p 宽高比

    if (aspectRatio > targetAspect) {
      // 宽屏视频使用 480p 预设
      return ['MPEG1VIDEO_480P', 'WMV2_480P', 'AVI_480P'];
    } else {
      // 其他视频使用 512x512 预设
      return ['MPEG1VIDEO_512X512', 'WMV2_512X512', 'AVI_512X512'];
    }
  }

  /**
   * 构建视频转换命令参数
   * 对应 Rust: VideoPreset::argv (video.rs:98-110)
   *
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param preset - 视频预设
   * @returns 命令参数数组
   */
  private static buildCommandArgs(
    inputPath: string,
    outputPath: string,
    preset: {
      executor: string;
      inputArgs: string[];
      filterArgs: string[];
      outputExt: string;
      outputCodec: string;
      extraArgs: string[];
    }
  ): string[] {
    return [
      ...preset.inputArgs,
      inputPath,
      ...preset.filterArgs,
      '-map_metadata',
      '0',
      '-c:v',
      preset.outputCodec,
      ...preset.extraArgs,
      outputPath,
    ];
  }

  /**
   * 收集目录中需要处理的文件
   *
   * @param dirPath - 目录路径
   * @param extensions - 文件扩展名列表
   * @returns 文件路径数组
   */
  private static async collectFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readDir(dirPath);

    for (const entry of entries) {
      if (entry.name === '.' || entry.name === '..') continue;

      const filePath = `${dirPath}/${entry.name}`;

      // 检查是否是文件
      let isFile = false;
      try {
        const metadata = await fs.stat(filePath);
        isFile = metadata.isFile ?? false;
      } catch {
        continue;
      }

      if (!isFile) continue;

      // 检查文件扩展名
      const ext = this.getExtension(entry.name);
      if (ext && extensions.includes(ext.toLowerCase())) {
        files.push(filePath);
      }
    }

    return files;
  }

  /**
   * 预检查可执行文件是否存在
   *
   * @param presetNames - 预设名称列表
   * @throws 如果可执行文件不存在
   */
  private static async checkExecutables(presetNames: string[]): Promise<void> {
    const executors = new Set<string>();

    for (const name of presetNames) {
      const preset = VIDEO_PRESETS[name];
      if (preset) {
        executors.add(preset.executor);
      }
    }

    for (const executor of executors) {
      const exists = await ProcessRunner.checkExecutable(executor);
      if (!exists) {
        throw new Error(`Executable not found: ${executor}`);
      }
    }
  }

  /**
   * 替换文件扩展名
   *
   * @param filePath - 文件路径
   * @param newExt - 新扩展名（不带点）
   * @returns 新文件路径
   */
  private static replaceExtension(filePath: string, newExt: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${filePath}.${newExt}`;
    }
    return filePath.substring(0, lastDotIndex + 1) + newExt;
  }

  /**
   * 获取文件扩展名（不带点）
   *
   * @param fileName - 文件名
   * @returns 扩展名或空字符串
   */
  private static getExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex + 1);
  }

  /**
   * 检查文件是否存在
   *
   * @param filePath - 文件路径
   * @returns 是否存在
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 视频文件转换
 * 对应 Python: transfer_video (bms_folder_media.py:35-52)
 *
 * @command
 * @category media
 * @dangerous true
 * @name 视频文件转换
 * @description 转换BMS根目录下的视频文件
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {VideoPreset[]} presetNames - 目标格式预设名称
 * @param {boolean} removeOriginFile - 成功时删除原文件
 * @param {boolean} removeExistingTargetFile - 删除已存在的目标文件
 * @param {boolean} usePrefered - 使用推荐预设
 * @param {IProgressManager} progressManager - 进度管理器（可选）
 *
 * @returns {Promise<void>}
 */
export async function transferVideo(
  rootDir: string,
  presetNames: VideoPreset[],
  removeOriginFile: boolean,
  removeExistingTargetFile: boolean,
  usePrefered: boolean,
  progressManager?: IProgressManager
): Promise<void> {
  await VideoConverter.processBmsFolders({
    rootDir,
    inputExtensions: [...VIDEO_FILE_EXTS],
    presetNames,
    removeOriginal: removeOriginFile,
    removeExisting: removeExistingTargetFile,
    usePreferred: usePrefered,
    progressManager,
  });
}
