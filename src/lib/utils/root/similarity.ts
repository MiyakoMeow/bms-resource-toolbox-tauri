/**
 * 根目录相似度扫描工具
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { bmsDirSimilarity } from '$lib/utils/fs/similarity.js';

/**
 * 相似文件夹对
 */
export interface SimilarFolderPair {
  dir1: string;
  dir2: string;
  similarity: number;
}

/**
 * 扫描目录中的相似文件夹
 */
export async function scanFolderSimilarFolders(
  rootDir: string,
  similarityThreshold: number
): Promise<SimilarFolderPair[]> {
  const entries = await readDir(rootDir);
  const dirs: string[] = [];

  // 收集所有子目录
  for (const entry of entries) {
    if (entry.children !== undefined && entry.name) {
      dirs.push(`${rootDir}/${entry.name}`);
    }
  }

  // 计算所有目录对之间的相似度
  const similarPairs: SimilarFolderPair[] = [];

  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const similarity = await bmsDirSimilarity(dirs[i], dirs[j]);

      if (similarity >= similarityThreshold) {
        similarPairs.push({
          dir1: dirs[i],
          dir2: dirs[j],
          similarity,
        });
      }
    }
  }

  // 按相似度降序排序
  similarPairs.sort((a, b) => b.similarity - a.similarity);

  return similarPairs;
}
