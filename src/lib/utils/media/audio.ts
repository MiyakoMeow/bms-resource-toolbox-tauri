/**
 * 音频转换模块
 * 从 Rust 代码迁移：src-tauri/src/media/audio.rs
 */

import * as fs from '@tauri-apps/plugin-fs';
import { ProcessRunner } from './processRunner.js';
import { ConcurrencyPool } from './concurrency.js';
import { AUDIO_PRESETS } from './presets.js';
import type { AudioProcessParams, AudioPreset } from './types.js';

/**
 * 音频转换器类
 */
export class AudioConverter {
	/**
	 * 批量处理 BMS 文件夹
	 * 对应 Rust: process_bms_folders (audio.rs:323-382)
	 *
	 * @param params - 音频处理参数
	 * @throws 如果目录操作或音频处理失败
	 */
	static async processBmsFolders(params: AudioProcessParams): Promise<void> {
		const { rootDir, inputExtensions, presetNames, removeOnSuccess, removeOnFail, skipOnFail } =
			params;

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
		for (const entry of entries) {
			if (!entry.children || entry.children.length === 0) {
				// Tauri FS API 的条目结构可能不同，需要根据实际情况调整
				// 这里假设是目录
			}

			// 检查是否是目录
			const entryPath = `${rootDir}/${entry.name}`;
			let isDir = false;
			try {
				const metadata = await fs.metadata(entryPath);
				isDir = metadata.isDirectory ?? false;
			} catch {
				continue;
			}

			if (!isDir) continue;

			const dirPath = entryPath;
			console.log(`Processing directory: ${dirPath}`);

			try {
				const success = await this.convertInDirectory(
					dirPath,
					inputExtensions,
					presets,
					removeOnSuccess,
					removeOnFail,
					true // 总是覆盖已存在的文件
				);

				if (success) {
					console.log(`Successfully processed ${dirPath}`);
				} else {
					console.error(`Errors occurred in ${dirPath}`);
					if (skipOnFail) {
						console.error('Skipping remaining folders due to error');
						break;
					}
				}
			} catch (error) {
				console.error(`Error processing ${dirPath}:`, error);
				if (skipOnFail) {
					break;
				}
			}
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
	 * @returns 是否完全成功
	 */
	static async convertInDirectory(
		dirPath: string,
		inputExtensions: string[],
		presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>,
		removeOnSuccess: boolean,
		removeOnFail: boolean,
		removeExisting: boolean
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

		for (const filePath of files) {
			const success = await pool.add(async () => {
				return await this.convertFile(filePath, presets, removeOnSuccess, removeOnFail, removeExisting);
			});

			if (!success) {
				hadError = true;
				const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
				failures.push(fileName);
			}
		}

		// 等待所有任务完成
		await pool.drain();

		// 输出处理结果
		if (totalFiles > 0) {
			console.log(`Processed ${totalFiles} files in ${dirPath}`);
		}
		if (failures.length > 0) {
			console.log(`${failures.length} files failed all presets:`, failures);
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
	 * @returns 是否成功
	 */
	private static async convertFile(
		filePath: string,
		presets: Array<{ executor: string; outputFormat: string; arguments?: string[] }>,
		removeOnSuccess: boolean,
		removeOnFail: boolean,
		removeExisting: boolean
	): Promise<boolean> {
		let currentPresetIndex = 0;
		let success = false;

		while (currentPresetIndex < presets.length) {
			const preset = presets[currentPresetIndex];
			const outputPath = this.replaceExtension(filePath, preset.outputFormat);

			// 如果目标文件已存在
			const outputExists = await this.fileExists(outputPath);
			if (outputExists) {
				if (removeExisting) {
					try {
						const metadata = await fs.metadata(outputPath);
						if (metadata.size && metadata.size > 0) {
							console.log(`Removing existing file: ${outputPath}`);
							await fs.remove(outputPath);
						}
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
				const metadata = await fs.metadata(filePath);
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
			await fs.metadata(filePath);
			return true;
		} catch {
			return false;
		}
	}
}
