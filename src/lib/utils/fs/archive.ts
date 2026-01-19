/**
 * 压缩包解压工具
 * 使用外部工具（7z、unzip、unrar）解压各种格式的压缩包
 */

import { Command } from '@tauri-apps/plugin-shell';
import { getFileExtension } from './path';

/**
 * 解压结果
 */
export interface ExtractResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
}

/**
 * 压缩包解压器
 */
export class ArchiveExtractor {
  /**
   * 自动检测格式并解压
   */
  static async extractAuto(file: string, dest: string): Promise<void> {
    const ext = getFileExtension(file);

    switch (ext) {
      case 'zip':
        await this.extractZip(file, dest);
        break;
      case '7z':
        await this.extract7z(file, dest);
        break;
      case 'rar':
        await this.extractRar(file, dest);
        break;
      case 'tar':
      case 'gz':
        await this.extractTar(file, dest);
        break;
      default:
        throw new Error(`Unsupported archive format: ${ext}`);
    }
  }

  /**
   * 解压 ZIP 文件（使用 unzip）
   */
  static async extractZip(file: string, dest: string): Promise<void> {
    try {
      const result = await Command.create('unzip', ['-q', file, '-d', dest]).execute();

      if (result.code !== 0) {
        throw new Error(`Failed to extract ZIP: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract ZIP file: ${error}`);
    }
  }

  /**
   * 解压 7Z 文件（使用 7z）
   */
  static async extract7z(file: string, dest: string): Promise<void> {
    try {
      // 7z 的 -o 参数需要紧接路径（无空格）
      const result = await Command.create('7z', ['x', '-y', `-o${dest}`, file]).execute();

      if (result.code !== 0) {
        throw new Error(`Failed to extract 7Z: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract 7Z file: ${error}`);
    }
  }

  /**
   * 解压 RAR 文件（使用 unrar）
   */
  static async extractRar(file: string, dest: string): Promise<void> {
    try {
      const result = await Command.create('unrar', ['x', '-y', file, dest]).execute();

      if (result.code !== 0) {
        throw new Error(`Failed to extract RAR: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract RAR file: ${error}`);
    }
  }

  /**
   * 解压 TAR/GZ 文件（使用 tar）
   */
  static async extractTar(file: string, dest: string): Promise<void> {
    try {
      const result = await Command.create('tar', ['-xf', file, '-C', dest]).execute();

      if (result.code !== 0) {
        throw new Error(`Failed to extract TAR: ${result.stderr}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract TAR file: ${error}`);
    }
  }

  /**
   * 检查系统是否安装了解压工具
   */
  static async checkAvailableTools(): Promise<{
    unzip: boolean;
    '7z': boolean;
    unrar: boolean;
    tar: boolean;
  }> {
    const tools = {
      unzip: false,
      '7z': false,
      unrar: false,
      tar: false,
    };

    // 检查 unzip
    try {
      const result = await Command.create('unzip', ['--version']).execute();
      tools.unzip = result.code === 0;
    } catch {
      tools.unzip = false;
    }

    // 检查 7z
    try {
      const result = await Command.create('7z', ['--help']).execute();
      tools['7z'] = result.code === 0;
    } catch {
      tools['7z'] = false;
    }

    // 检查 unrar
    try {
      const result = await Command.create('unrar', ['--help']).execute();
      tools.unrar = result.code === 0;
    } catch {
      tools.unrar = false;
    }

    // 检查 tar
    try {
      const result = await Command.create('tar', ['--version']).execute();
      tools.tar = result.code === 0;
    } catch {
      tools.tar = false;
    }

    return tools;
  }
}
