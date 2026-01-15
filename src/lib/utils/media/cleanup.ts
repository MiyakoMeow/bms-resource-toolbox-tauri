/**
 * 媒体文件清理模块
 * 从 Rust 代码迁移：
 * - work.rs: remove_zero_sized_media_files (264-312)
 * - root_bigpack.rs: remove_unneed_media_files (737-757), workdir_remove_unneed_media_files (538-636)
 */

import * as fs from '@tauri-apps/plugin-fs';
import { REMOVE_MEDIA_RULES } from './presets.js';
import { RemoveMediaPreset } from '$lib/types/enums.js';
import type { MediaCleanupParams, RemoveMediaRule } from './types.js';

/**
 * 媒体文件清理器类
 */
export class MediaCleaner {
	/**
	 * 删除零字节媒体文件
	 * 对应 Rust: remove_zero_sized_media_files (work.rs:264-312)
	 *
	 * @param dir - 目录路径
	 * @param dryRun - 是否模拟运行（不实际删除）
	 * @throws 如果目录操作失败
	 */
	static async removeZeroSizedMediaFiles(dir: string, dryRun: boolean): Promise<void> {
		if (dryRun) {
			console.log('[dry-run] Start: work::remove_zero_sized_media_files');
		}

		const stack: string[] = [dir];
		const tasks: Promise<void>[] = [];

		while (stack.length > 0) {
			const currentDir = stack.pop()!;
			const entries = await fs.readDir(currentDir);

			for (const entry of entries) {
				if (entry.name === '.' || entry.name === '..') continue;

				const path = `${currentDir}/${entry.name}`;

				// 检查是否是文件
				let isFile = false;
				let size = 0;
				try {
					const metadata = await fs.metadata(path);
					isFile = metadata.isFile ?? false;
					size = metadata.size || 0;
				} catch {
					continue;
				}

				if (isFile && size === 0) {
					// 异步删除，任务句柄进入数组
					if (dryRun) {
						console.log(`Would remove empty file: ${path}`);
					} else {
						tasks.push(
							(async () => {
								try {
									await fs.remove(path);
								} catch (error) {
									console.error(`Failed to remove file: ${path}`, error);
								}
							})()
						);
					}
				} else {
					// 检查是否是目录，继续推入栈
					let isDir = false;
					try {
						const metadata = await fs.metadata(path);
						isDir = metadata.isDirectory ?? false;
					} catch {
						continue;
					}

					if (isDir) {
						stack.push(path);
					}
				}
			}
		}

		// 等待所有删除任务完成
		if (!dryRun) {
			await Promise.all(tasks);
		}

		if (dryRun) {
			console.log('[dry-run] End: work::remove_zero_sized_media_files');
		}
	}

	/**
	 * 根据规则删除不需要的媒体文件
	 * 对应 Rust: remove_unneed_media_files (root_bigpack.rs:737-757)
	 *
	 * @param rootDir - 根目录路径
	 * @param preset - 删除规则预设
	 * @throws 如果目录操作失败
	 */
	static async removeUnneedMediaFiles(rootDir: string, preset: RemoveMediaPreset): Promise<void> {
		const rules = REMOVE_MEDIA_RULES[preset];
		console.log('Selected rules:', rules);

		// 遍历根目录下的所有子目录
		const entries = await fs.readDir(rootDir);
		for (const entry of entries) {
			if (entry.name === '.' || entry.name === '..') continue;

			const bmsDirPath = `${rootDir}/${entry.name}`;

			// 检查是否是目录
			let isDir = false;
			try {
				const metadata = await fs.metadata(bmsDirPath);
				isDir = metadata.isDirectory ?? false;
			} catch {
				continue;
			}

			if (!isDir) continue;

			await this.removeUnneedMediaFilesInDir(bmsDirPath, rules);
		}
	}

	/**
	 * 删除单个目录中不需要的媒体文件
	 * 对应 Rust: workdir_remove_unneed_media_files (root_bigpack.rs:538-636)
	 *
	 * @param workDir - 工作目录路径
	 * @param rules - 删除规则列表
	 * @throws 如果目录操作失败
	 */
	private static async removeUnneedMediaFilesInDir(
		workDir: string,
		rules: RemoveMediaRule[]
	): Promise<void> {
		const removePairs: Array<[string, string]> = [];
		const removedFiles = new Set<string>();

		const entries = await fs.readDir(workDir);

		for (const entry of entries) {
			if (entry.name === '.' || entry.name === '..') continue;

			const filePath = `${workDir}/${entry.name}`;

			// 检查是否是文件
			let isFile = false;
			try {
				const metadata = await fs.metadata(filePath);
				isFile = metadata.isFile ?? false;
			} catch {
				continue;
			}

			if (!isFile) continue;

			const fileName = entry.name;
			const fileExt = this.getExtension(fileName);

			for (const [upperExts, lowerExts] of rules) {
				if (!upperExts.includes(fileExt)) {
					continue;
				}

				// 检查文件是否为空
				const metadata = await fs.metadata(filePath);
				if (metadata.size === 0) {
					console.log(` - !x!: File ${filePath} is Empty! Skipping...`);
					continue;
				}

				// 文件在 upper_exts 中，查找 lower_exts 中的对应文件
				for (const lowerExt of lowerExts) {
					const replacingFilePath = this.replaceExtension(filePath, lowerExt);

					// 文件不存在？
					const exists = await this.fileExists(replacingFilePath);
					if (!exists) {
						continue;
					}
					if (removedFiles.has(replacingFilePath)) {
						continue;
					}

					removePairs.push([filePath, replacingFilePath]);
					removedFiles.add(replacingFilePath);
				}
			}
		}

		if (removePairs.length > 0) {
			console.log(`Entering: ${workDir}`);
		}

		// 删除文件
		for (const [filePath, replacingFilePath] of removePairs) {
			const replacingFileName = replacingFilePath.split('/').pop() || replacingFilePath.split('\\').pop() || '';
			const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
			console.log(`- Remove file ${replacingFileName}, because ${fileName} exists.`);

			try {
				await fs.remove(replacingFilePath);
			} catch (error) {
				console.error(`Failed to remove file: ${replacingFilePath}`, error);
			}
		}

		// 统计扩展名数量
		const extCount: Record<string, string[]> = {};
		const countEntries = await fs.readDir(workDir);

		for (const entry of countEntries) {
			if (entry.name === '.' || entry.name === '..') continue;

			const filePath = `${workDir}/${entry.name}`;

			// 检查是否是文件
			let isFile = false;
			try {
				const metadata = await fs.metadata(filePath);
				isFile = metadata.isFile ?? false;
			} catch {
				continue;
			}

			if (!isFile) continue;

			const fileName = entry.name;
			const fileExt = this.getExtension(fileName);

			if (!extCount[fileExt]) {
				extCount[fileExt] = [];
			}
			extCount[fileExt].push(fileName);
		}

		// 检查是否有多个 mp4 文件
		if (extCount['mp4'] && extCount['mp4'].length > 1) {
			console.log(` - Tips: ${workDir} has more than 1 mp4 files!`, extCount['mp4']);
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
		const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
		// 确保最后一个点在最后一个斜杠之后（是文件扩展名而不是路径中的点）
		if (lastDotIndex > lastSlashIndex) {
			return filePath.substring(0, lastDotIndex + 1) + newExt;
		}
		return `${filePath}.${newExt}`;
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
		return fileName.substring(lastDotIndex + 1).toLowerCase();
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
