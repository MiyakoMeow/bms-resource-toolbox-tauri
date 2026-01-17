/**
 * 原始包文件编号工具
 * 从 Python 代码迁移：legacy/options/rawpack.py
 *
 * 为原始包文件添加编号前缀
 */

import * as fs from '@tauri-apps/plugin-fs';

/**
 * 可重命名的文件信息
 */
export interface RenameableFile {
  /** 原始文件名 */
  originalName: string;
  /** 完整路径 */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件扩展名 */
  extension: string;
  /** 是否有部分文件（.part） */
  hasPartial: boolean;
}

/**
 * 文件编号设置参数
 */
export interface SetFileNumParams {
  /** 目录路径 */
  dir: string;
  /** 允许的扩展名列表（空表示不限制） */
  allowExtensions: string[];
  /** 禁止的扩展名列表 */
  disallowExtensions: string[];
  /** 是否允许不在 allowExtensions 列表中的文件 */
  allowOthers: boolean;
  /** 是否模拟运行（不实际重命名） */
  dryRun: boolean;
}

/**
 * 重命名操作
 */
export interface RenameOperation {
  /** 原始文件名 */
  originalName: string;
  /** 新文件名 */
  newName: string;
  /** 完整路径 */
  path: string;
  /** 编号 */
  num: number;
}

/**
 * 原始包文件编号工具类
 */
export class FileNumberSetter {
  /**
   * 获取目录中可重命名的文件列表
   * 对应 Rust: _set_file_num (rawpack.py:152-209)
   *
   * @param dir - 目录路径
   * @param allowExtensions - 允许的扩展名列表
   * @param disallowExtensions - 禁止的扩展名列表
   * @param allowOthers - 是否允许不在 allowExtensions 列表中的文件
   * @returns 可重命名的文件列表
   *
   * @example
   * ```typescript
   * const files = await FileNumberSetter.getRenameableFiles('/path/to/packs', ['zip', '7z', 'rar'], [], false);
   * console.log(`Found ${files.length} files to rename`);
   * ```
   */
  static async getRenameableFiles(
    dir: string,
    allowExtensions: string[] = [],
    disallowExtensions: string[] = [],
    allowOthers: boolean = true
  ): Promise<RenameableFile[]> {
    const files: RenameableFile[] = [];
    const entries = await fs.readDir(dir);

    for (const entry of entries) {
      // 跳过目录
      if (entry.isDirectory) {
        continue;
      }

      if (!entry.name) {
        continue;
      }

      // 已有编号前缀？
      const firstWord = entry.name.split(' ')[0];
      if (/^\d+$/.test(firstWord)) {
        continue;
      }

      // 检查是否有部分文件
      const hasPartial = await fs.exists(`${dir}/${entry.name}.part`);
      if (hasPartial) {
        continue;
      }

      // 获取文件大小
      let size = 0;
      try {
        const metadata = await fs.stat(`${dir}/${entry.name}`);
        size = metadata.size || 0;
      } catch {
        continue;
      }

      // 空文件？
      if (size === 0) {
        continue;
      }

      // 检查扩展名
      const extension = entry.name.split('.').pop()?.toLowerCase() || '';
      let allowed = allowOthers;

      if (allowExtensions.includes(extension)) {
        allowed = true;
      } else if (disallowExtensions.includes(extension)) {
        allowed = false;
      }

      if (!allowed) {
        continue;
      }

      files.push({
        originalName: entry.name,
        path: `${dir}/${entry.name}`,
        size,
        extension,
        hasPartial,
      });
    }

    return files;
  }

  /**
   * 重命名文件，添加编号前缀
   * 对应 Rust: _rename_file_with_num (rawpack.py:143-149)
   *
   * @param dir - 目录路径
   * @param fileName - 文件名
   * @param num - 要添加的编号
   * @param dryRun - 是否模拟运行
   * @returns 重命名操作信息
   *
   * @example
   * ```typescript
   * const operation = await FileNumberSetter.renameFileWithNum('/path/to/packs', 'song.zip', 123, false);
   * console.log(`Renamed ${operation.originalName} to ${operation.newName}`);
   * ```
   */
  static async renameFileWithNum(
    dir: string,
    fileName: string,
    num: number,
    dryRun: boolean = false
  ): Promise<RenameOperation> {
    const oldPath = `${dir}/${fileName}`;
    const newName = `${num} ${fileName}`;
    const newPath = `${dir}/${newName}`;

    if (!dryRun) {
      await fs.rename(oldPath, newPath);
    }

    return {
      originalName: fileName,
      newName,
      path: oldPath,
      num,
    };
  }

  /**
   * 批量重命名文件，添加编号前缀
   *
   * @command
   * @category rawpack
   * @dangerous true
   * @name 批量添加文件编号
   * @description 为多个文件添加编号前缀
   * @frontend true
   *
   * @param {SetFileNumParams} params - 编号设置参数
   * @returns {Promise<RenameOperation[]>} 执行的重命名操作列表
   *
   * @example
   * ```typescript
   * const operations = await FileNumberSetter.batchRenameWithNum({
   *   dir: '/path/to/packs',
   *   allowExtensions: ['zip', '7z', 'rar'],
   *   disallowExtensions: [],
   *   allowOthers: false,
   *   dryRun: false
   * });
   * console.log(`Renamed ${operations.length} files`);
   * ```
   */
  static async batchRenameWithNum(params: SetFileNumParams): Promise<RenameOperation[]> {
    const { dir, allowExtensions, disallowExtensions, allowOthers, dryRun } = params;

    // 获取可重命名的文件
    const files = await this.getRenameableFiles(
      dir,
      allowExtensions,
      disallowExtensions,
      allowOthers
    );

    if (files.length === 0) {
      return [];
    }

    // 执行重命名
    const operations: RenameOperation[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const operation = await this.renameFileWithNum(
        dir,
        file.originalName,
        i + 1, // 编号从1开始
        dryRun
      );
      operations.push(operation);
    }

    return operations;
  }

  /**
   * 交互式文件编号设置
   * 对应 Rust: set_file_num (rawpack.py:211-213)
   *
   * 注意：此函数设计用于命令行界面，GUI 应用应使用 `batchRenameWithNum`
   *
   * @param dir - 目录路径
   * @param allowExtensions - 允许的扩展名列表
   * @param disallowExtensions - 禁止的扩展名列表
   * @param allowOthers - 是否允许不在 allowExtensions 列表中的文件
   * @returns 可重命名的文件列表（用于UI显示）
   *
   * @example
   * ```typescript
   * const files = await FileNumberSetter.interactiveSetFileNum('/path/to/packs', ['zip', '7z', 'rar'], [], false);
   * // 在UI中显示 files 列表让用户选择
   * ```
   */
  static async interactiveSetFileNum(
    dir: string,
    allowExtensions: string[] = ['zip', '7z', 'rar'],
    disallowExtensions: string[] = [],
    allowOthers: boolean = false
  ): Promise<RenameableFile[]> {
    return this.getRenameableFiles(dir, allowExtensions, disallowExtensions, allowOthers);
  }
}
