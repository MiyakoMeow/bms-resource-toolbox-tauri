/**
 * 相似文件夹名称扫描
 * 从 Python 代码迁移：legacy/options/bms_folder.py 中的 scan_folder_similar_folders 函数
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { stringSimilarity } from '$lib/utils/fs/similarity.js';

/**
 * 扫描相似文件夹名称
 *
 * @command
 * @category root
 * @dangerous false
 * @name 扫描相似文件夹
 * @description 扫描指定目录中名称相似的文件夹，用于发现重复或误操作
 * @frontend true
 *
 * @param {string} rootDir - 要扫描的目录路径
 * @param {number} similarityTrigger - 相似度触发阈值（默认 0.7）
 *
 * @returns {Promise<Array<{ folder1: string; folder2: string; similarity: number }>>}
 */
export async function scanSimilarFolders(
  rootDir: string,
  similarityTrigger: number = 0.7
): Promise<Array<{ folder1: string; folder2: string; similarity: number }>> {
  const entries = await readDir(rootDir);

  // 只处理目录
  const dirNames = entries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  console.log(`当前目录下有 ${dirNames.length} 个文件夹。`);

  const result: Array<{ folder1: string; folder2: string; similarity: number }> = [];

  // 排序
  dirNames.sort();

  // 扫描相邻文件夹
  for (let i = 1; i < dirNames.length; i++) {
    const formerDirName = dirNames[i - 1];
    const currentDirName = dirNames[i];

    // 计算相似度
    const similarity = stringSimilarity(formerDirName, currentDirName);

    if (similarity < similarityTrigger) {
      continue;
    }

    result.push({
      folder1: formerDirName,
      folder2: currentDirName,
      similarity,
    });

    console.log(
      `发现相似项：${formerDirName} <=> ${currentDirName} (相似度: ${(similarity * 100).toFixed(2)}%)`
    );
  }

  return result;
}
