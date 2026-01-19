/**
 * Aery 标签作品处理工具
 * 对应 Python: legacy/wasted/aery_fix.py
 *
 * 用于处理 Aery 标签作品的特殊合并逻辑
 * 这些作品通常有相似的文件夹结构，需要根据相似度阈值进行合并
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '../fs/moving';
import { calculateSimilarity } from '../fs/similarity';

/**
 * Aery 标签作品修复参数
 */
export interface AeryFixParams {
  /** 根目录路径 */
  rootDir: string;
  /** 相似度阈值（0-1，默认 0.8） */
  similarityThreshold: number;
  /** 是否模拟运行（不实际执行） */
  dryRun: boolean;
}

/**
 * 合并对信息
 */
export interface MergePair {
  /** 目标文件夹路径 */
  target: string;
  /** 源文件夹路径 */
  source: string;
  /** 相似度 */
  similarity: number;
  /** 目标文件夹名 */
  targetName: string;
  /** 源文件夹名 */
  sourceName: string;
}

/**
 * Aery 标签作品处理器
 */
export class AeryFix {
  /**
   * Aery 标签作品修复
   * 对应 Python: aery_fix (aery_fix.py)
   *
   * 功能：
   * 1. 扫描目录中的所有文件夹
   * 2. 计算文件夹之间的相似度
   * 3. 对于相似度高于阈值的文件夹对，进行合并
   * 4. 保留第一个文件夹，将第二个文件夹的内容合并到第一个
   *
   * @command
   * @category wasted
   * @dangerous true
   * @name Aery 标签作品修复
   * @description 处理 Aery 标签作品的特殊合并逻辑，根据相似度阈值合并相似文件夹
   * @frontend true
   *
   * @param {string} rootDir - 根目录路径
   * @param {number} similarityThreshold - 相似度阈值（0-1，默认 0.8）
   * @param {boolean} dryRun - 模拟运行（不实际执行）
   *
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // 使用默认阈值（0.8）进行修复
   * await AeryFix.fix({
   *   rootDir: 'D:/Packs/BOFTT',
   *   similarityThreshold: 0.8,
   *   dryRun: false
   * });
   *
   * // 使用更严格的阈值（0.9）进行修复
   * await AeryFix.fix({
   *   rootDir: 'D:/Packs/BOFTT',
   *   similarityThreshold: 0.9,
   *   dryRun: true  // 先模拟运行
   * });
   * ```
   */
  static async fix(params: AeryFixParams): Promise<void> {
    const { rootDir, similarityThreshold, dryRun } = params;

    // 验证阈值范围
    if (similarityThreshold < 0 || similarityThreshold > 1) {
      throw new Error('相似度阈值必须在 0 到 1 之间');
    }

    console.log(`开始 Aery 标签作品修复`);
    console.log(`根目录: ${rootDir}`);
    console.log(`相似度阈值: ${similarityThreshold}`);
    console.log(`模拟运行: ${dryRun}\n`);

    // 获取所有文件夹名
    const entries = await readDir(rootDir);
    const dirNames = entries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

    if (dirNames.length === 0) {
      console.log('当前目录下没有文件夹');
      return;
    }

    console.log(`当前目录下有 ${dirNames.length} 个文件夹`);

    // 按名称排序
    dirNames.sort();

    // 查找相似文件夹对
    const pairs = await this.findSimilarPairs(rootDir, dirNames, similarityThreshold);

    if (pairs.length === 0) {
      console.log(`\n未找到相似度高于 ${similarityThreshold} 的文件夹对`);
      return;
    }

    // 输出合并计划
    console.log(`\n找到 ${pairs.length} 个需要合并的文件夹对：\n`);

    for (const pair of pairs) {
      console.log(`  相似度: ${(pair.similarity * 100).toFixed(1)}%`);
      console.log(`    目标: ${pair.targetName}`);
      console.log(`    源:   ${pair.sourceName}\n`);
    }

    if (dryRun) {
      console.log('[dry-run] 跳过实际合并操作');
      return;
    }

    console.log('开始合并...\n');

    // 执行合并
    for (const pair of pairs) {
      console.log(`  合并: '${pair.sourceName}' -> '${pair.targetName}'`);

      await moveElementsAcrossDir(
        pair.source,
        pair.target,
        replaceOptionsFromPreset(ReplacePreset.UpdatePack)
      );

      // 删除空源目录
      const { remove } = await import('@tauri-apps/plugin-fs');
      try {
        const sourceEntries = await readDir(pair.source);
        if (sourceEntries.length === 0) {
          await remove(pair.source, { recursive: true });
          console.log(`    已删除空目录: ${pair.sourceName}`);
        }
      } catch (error) {
        console.warn(`    删除目录失败: ${pair.sourceName}`, error);
      }
    }

    console.log(`\nAery 标签作品修复完成，共 ${pairs.length} 个操作`);
  }

  /**
   * 查找相似文件夹对
   *
   * @param rootDir - 根目录路径
   * @param dirNames - 文件夹名列表（已排序）
   * @param similarityThreshold - 相似度阈值
   * @returns 相似文件夹对列表
   */
  private static async findSimilarPairs(
    rootDir: string,
    dirNames: string[],
    similarityThreshold: number
  ): Promise<MergePair[]> {
    const pairs: MergePair[] = [];

    // 遍历相邻的文件夹对
    for (let i = 0; i < dirNames.length - 1; i++) {
      const name1 = dirNames[i];
      const name2 = dirNames[i + 1];

      // 检查是否都是 Aery 标签作品
      if (!this.isAeryLabeled(name1) || !this.isAeryLabeled(name2)) {
        continue;
      }

      // 计算相似度
      const similarity = calculateSimilarity(name1, name2);

      // 检查是否达到阈值
      if (similarity >= similarityThreshold) {
        const path1 = `${rootDir}/${name1}`;
        const path2 = `${rootDir}/${name2}`;

        pairs.push({
          target: path1,
          source: path2,
          similarity,
          targetName: name1,
          sourceName: name2,
        });
      }
    }

    return pairs;
  }

  /**
   * 检查文件夹名是否为 Aery 标签作品
   *
   * Aery 标签作品通常包含 "Aery" 或 "aery" 字符串
   *
   * @param name - 文件夹名
   * @returns 是否为 Aery 标签作品
   */
  private static isAeryLabeled(name: string): boolean {
    const lowerName = name.toLowerCase();
    return (
      lowerName.includes('aery') ||
      lowerName.includes('aery_') ||
      lowerName.includes('-aery') ||
      lowerName.includes('_aery')
    );
  }
}

/**
 * 导出便捷函数
 */
export const aeryFix = AeryFix.fix.bind(AeryFix);
