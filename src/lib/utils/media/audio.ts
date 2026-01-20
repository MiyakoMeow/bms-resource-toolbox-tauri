/**
 * 音频转换模块
 * 从 Rust 代码迁移：src-tauri/src/media/audio.rs
 */

import * as fs from '@tauri-apps/plugin-fs';
import { ProcessRunner } from './processRunner';
import { ConcurrencyPool } from './concurrency';
import { AUDIO_PRESETS } from './presets';
import type { AudioPreset, AudioProcessParams } from './types';
import type { IProgressManager } from '../progress';
import { AUDIO_FILE_EXTS } from '../bms/scanner';

/**
 * 音频转换器类
 */
export class AudioConverter {
  /**
   * 静态记录失败文件的映射
   * Key: 目录路径, Value: 失败的文件列表
   */
  private static failedFilesMap = new Map<string, string[]>();

  /**
   * 获取失败文件列表
   * @param dirPath - 目录路径
   * @returns 失败的文件列表
   */
  static getFailedFiles(dirPath: string): string[] {
    return this.failedFilesMap.get(dirPath) || [];
  }

  /**
   * 清除失败文件记录
   * @param dirPath - 目录路径（可选，不传则清除所有）
   */
  static clearFailedFiles(dirPath?: string): void {
    if (dirPath) {
      this.failedFilesMap.delete(dirPath);
    } else {
      this.failedFilesMap.clear();
    }
  }

  /**
   * 重试失败文件的转换
   * @param dirPath - 目录路径
   * @param inputExtensions - 输入文件扩展名列表
   * @param presets - 音频预设列表
   * @param removeOnSuccess - 成功时是否删除原文件
   * @param removeOnFail - 失败时是否删除原文件
   * @param removeExisting - 是否删除已存在的输出文件
   * @param progressManager - 进度管理器（可选）
   * @returns 是否完全成功
   */
  static async retryFailedFiles(
    dirPath: string,
    inputExtensions: string[],
    presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>,
    removeOnSuccess: boolean,
    removeOnFail: boolean,
    removeExisting: boolean,
    progressManager?: IProgressManager
  ): Promise<boolean> {
    const failedFiles = this.getFailedFiles(dirPath);
    if (failedFiles.length === 0) {
      console.log(`No failed files to retry in ${dirPath}`);
      return true;
    }

    console.log(`Retrying ${failedFiles.length} failed files in ${dirPath}`);
    const newFailures: string[] = [];

    // 使用并发池重试失败的文件
    const pool = new ConcurrencyPool(64);
    const promises: Promise<unknown>[] = [];

    for (const fileName of failedFiles) {
      const filePath = `${dirPath}/${fileName}`;

      promises.push(
        pool.add(async () => {
          const success = await this.convertFile(
            filePath,
            presets,
            removeOnSuccess,
            removeOnFail,
            removeExisting,
            progressManager
          );

          if (!success) {
            newFailures.push(fileName);
          }
        })
      );
    }

    await Promise.all(promises);
    await pool.drain();

    // 更新失败文件列表
    this.failedFilesMap.set(dirPath, newFailures);

    if (newFailures.length === 0) {
      console.log(`All ${failedFiles.length} files succeeded on retry`);
      this.failedFilesMap.delete(dirPath);
    } else {
      console.log(`${newFailures.length} files still failed after retry:`, newFailures);
    }

    return newFailures.length === 0;
  }
  /**
   * 批量处理 BMS 文件夹
   * 对应 Rust: process_bms_folders (audio.rs:323-382)
   *
   * @param params - 音频处理参数
   * @throws 如果目录操作或音频处理失败
   */
  static async processBmsFolders(params: AudioProcessParams): Promise<void> {
    const {
      rootDir,
      inputExtensions,
      presetNames,
      removeOnSuccess,
      removeOnFail,
      skipOnFail,
      progressManager,
    } = params;

    // 启动进度管理器
    progressManager?.start();

    try {
      // 解析预设名称为预设对象
      const presets = presetNames
        .map((name) => {
          const presetName = typeof name === 'string' ? name : String(name);
          return AUDIO_PRESETS[presetName];
        })
        .filter((preset) => preset !== undefined);

      if (presets.length === 0) {
        throw new Error('No valid presets provided');
      }

      // 遍历根目录下的所有子目录
      const entries = await fs.readDir(rootDir);
      const folders = entries.filter((e) => e.isDirectory && e.name);

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

        const entry = folders[i];
        const dirPath = `${rootDir}/${entry.name}`;

        progressManager?.update(i, folders.length, `处理 ${entry.name}`);

        try {
          const success = await this.convertInDirectory(
            dirPath,
            inputExtensions,
            presets,
            removeOnSuccess,
            removeOnFail,
            true, // 总是覆盖已存在的文件
            progressManager
          );

          if (success) {
            console.log(`Successfully processed ${dirPath}`);
          } else {
            console.error(`Errors occurred in ${dirPath}`);
            // 遇到错误时跳过，不抛出异常
            if (skipOnFail) {
              console.error('Skipping remaining folders due to error');
              break;
            }
          }
        } catch (error) {
          console.error(`Error processing ${dirPath}:`, error);
          // 遇到错误时跳过，不抛出异常
          if (skipOnFail) {
            break;
          }
        }
      }

      // 完成
      progressManager?.update(folders.length, folders.length, '音频转换完成');
    } catch (error) {
      progressManager?.reportError(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 转换单个目录下的音频文件
   * 对应 Rust: transfer_audio_in_directory (audio.rs:140-308)
   *
   * @param dirPath - 目录路径
   * @param inputExtensions - 输入文件扩展名列表
   * @param presets - 音频预设列表
   * @param removeOnSuccess - 成功时是否删除原文件
   * @param removeOnFail - 失败时是否删除原文件
   * @param removeExisting - 是否删除已存在的输出文件
   * @param progressManager - 进度管理器（可选）
   * @returns 是否完全成功
   */
  static async convertInDirectory(
    dirPath: string,
    inputExtensions: string[],
    presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>,
    removeOnSuccess: boolean,
    removeOnFail: boolean,
    removeExisting: boolean,
    progressManager?: IProgressManager
  ): Promise<boolean> {
    // 收集需要处理的文件
    const files = await this.collectFiles(dirPath, inputExtensions);
    const totalFiles = files.length;

    if (totalFiles > 0) {
      console.log(`Entering dir: ${dirPath}, Input extensions: ${inputExtensions}`);
      console.log(`Using ${presets.length} presets`);
    }

    // 预检查可执行文件是否存在
    await this.checkExecutables(presets);

    const failures: string[] = [];
    let hadError = false;

    // 使用并发池处理文件
    const pool = new ConcurrencyPool(64);

    const promises: Promise<unknown>[] = [];
    for (const filePath of files) {
      // 检查是否应该停止（暂停或取消）
      if (progressManager?.shouldStop()) {
        if (progressManager.getProgress().cancelled) {
          console.log('任务已取消');
          break;
        }
        // 等待恢复
        await progressManager.waitForResume();
      }

      promises.push(
        pool.add(async () => {
          const success = await this.convertFile(
            filePath,
            presets,
            removeOnSuccess,
            removeOnFail,
            removeExisting,
            progressManager
          );

          if (!success) {
            hadError = true;
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
            failures.push(fileName);
          }
        })
      );
    }

    await Promise.all(promises);

    // 等待所有任务完成
    await pool.drain();

    // 输出处理结果
    if (totalFiles > 0) {
      console.log(`Processed ${totalFiles} files in ${dirPath}`);
    }
    if (failures.length > 0) {
      console.log(`${failures.length} files failed all presets:`, failures);
      // 记录失败文件到静态映射
      this.failedFilesMap.set(dirPath, failures);
    }
    if (hadError && removeOnFail) {
      console.log('Original files for failed conversions were removed');
    }

    return !hadError;
  }

  /**
   * 转换单个音频文件
   * 对应 Rust 中的文件处理逻辑 (audio.rs:200-282)
   *
   * @param filePath - 文件路径
   * @param presets - 音频预设列表
   * @param removeOnSuccess - 成功时是否删除原文件
   * @param removeOnFail - 失败时是否删除原文件
   * @param removeExisting - 是否删除已存在的输出文件
   * @param progressManager - 进度管理器（可选）
   * @returns 是否成功
   */
  private static async convertFile(
    filePath: string,
    presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>,
    removeOnSuccess: boolean,
    removeOnFail: boolean,
    removeExisting: boolean,
    progressManager?: IProgressManager
  ): Promise<boolean> {
    let currentPresetIndex = 0;
    let success = false;

    while (currentPresetIndex < presets.length) {
      // 检查是否应该停止（暂停或取消）
      if (progressManager?.shouldStop()) {
        if (progressManager.getProgress().cancelled) {
          console.log('转换已取消');
          return false;
        }
        // 等待恢复
        await progressManager.waitForResume();
      }

      const preset = presets[currentPresetIndex];
      const outputPath = this.replaceExtension(filePath, preset.outputFormat);

      // 更新进度消息
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      progressManager?.setMessage(`转换 ${fileName} [${currentPresetIndex + 1}/${presets.length}]`);

      // 如果目标文件已存在
      const outputExists = await this.fileExists(outputPath);
      if (outputExists) {
        if (removeExisting) {
          try {
            console.log(`Removing existing file: ${outputPath}`);
            await fs.remove(outputPath);
          } catch (error) {
            console.error(`Failed to remove existing file: ${outputPath}`, error);
          }
        } else {
          console.log(`Skipping existing file: ${outputPath}`);
          currentPresetIndex++;
          continue;
        }
      }

      // 构建并执行命令
      const args = this.buildCommandArgs(filePath, outputPath, preset);

      const result = await ProcessRunner.exec(preset.executor, args);

      if (result.success) {
        if (removeOnSuccess) {
          try {
            await fs.remove(filePath);
          } catch (error) {
            console.error(`Error deleting original file: ${filePath}`, error);
          }
        }
        success = true;
        break;
      } else {
        console.log(
          `Preset failed [${preset.executor}]: ${filePath} -> ${outputPath}`,
          result.stderr
        );
      }

      currentPresetIndex++;
    }

    if (!success) {
      if (removeOnFail) {
        try {
          await fs.remove(filePath);
        } catch (error) {
          console.error(`Error deleting failed file: ${filePath}`, error);
        }
      }
    }

    return success;
  }

  /**
   * 构建音频转换命令参数
   * 对应 Rust: build_audio_command (audio.rs:80-126)
   *
   * @param inputPath - 输入文件路径
   * @param outputPath - 输出文件路径
   * @param preset - 音频预设
   * @returns 命令参数数组
   */
  private static buildCommandArgs(
    inputPath: string,
    outputPath: string,
    preset: { executor: string; outputFormat: string; arguments?: string[] }
  ): string[] {
    const args: string[] = [];

    switch (preset.executor) {
      case 'ffmpeg': {
        args.push('-hide_banner', '-loglevel', 'panic', '-i', inputPath);
        args.push('-f', preset.outputFormat);
        args.push('-map_metadata', '0');
        if (preset.arguments) {
          args.push(...preset.arguments);
        }
        args.push(outputPath);
        break;
      }
      case 'oggenc': {
        if (preset.arguments) {
          args.push(...preset.arguments);
        }
        args.push(inputPath, '-o', outputPath);
        break;
      }
      case 'flac': {
        if (preset.arguments) {
          args.push(...preset.arguments);
        }
        args.push(inputPath, '-o', outputPath);
        break;
      }
      default: {
        args.push(inputPath, outputPath);
        break;
      }
    }

    return args;
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
   * @param presets - 音频预设列表
   * @throws 如果可执行文件不存在
   */
  private static async checkExecutables(
    presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>
  ): Promise<void> {
    const executors = new Set(presets.map((p) => p.executor));

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
 * 音频文件转换
 * 对应 Python: transfer_audio (bms_folder_media.py:15-32)
 *
 * @command
 * @category media
 * @dangerous true
 * @name 音频文件转换
 * @description 转换BMS根目录下的音频文件
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {AudioPreset[]} presetNames - 目标格式预设名称
 * @param {boolean} removeOriginFileWhenSuccess - 成功时删除原文件
 * @param {boolean} removeOriginFileWhenFailed - 失败时删除原文件
 * @param {boolean} skipOnFail - 遇到失败时跳过
 * @param {IProgressManager} progressManager - 进度管理器（可选）
 *
 * @returns {Promise<void>}
 */
export async function transferAudio(
  rootDir: string,
  presetNames: AudioPreset[],
  removeOriginFileWhenSuccess: boolean,
  removeOriginFileWhenFailed: boolean,
  skipOnFail: boolean,
  progressManager?: IProgressManager
): Promise<void> {
  await AudioConverter.processBmsFolders({
    rootDir,
    inputExtensions: [...AUDIO_FILE_EXTS],
    presetNames,
    removeOnSuccess: removeOriginFileWhenSuccess,
    removeOnFail: removeOriginFileWhenFailed,
    skipOnFail,
    progressManager,
  });
}
