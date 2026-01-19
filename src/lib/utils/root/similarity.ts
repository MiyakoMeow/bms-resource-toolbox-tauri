/**
 * 根目录相似度扫描工具
 */

import { readDir } from '@tauri-apps/plugin-fs';
import { bmsDirSimilarity } from '../fs/similarity';

/**
 * 相似文件夹对
 */
export interface SimilarFolderPair {
  dir1: string;
  dir2: string;
  similarity: number;
}

/**
 * 目录内容缓存
 */
interface DirCache {
  entries: Awaited<ReturnType<typeof readDir>>;
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
    if (entry.isDirectory && entry.name) {
      dirs.push(`${rootDir}/${entry.name}`);
    }
  }

  // 预读取并缓存所有目录的内容
  const dirCache = new Map<string, DirCache>();
  for (const dir of dirs) {
    try {
      dirCache.set(dir, { entries: await readDir(dir) });
    } catch {
      dirCache.set(dir, { entries: [] });
    }
  }

  // 计算所有目录对之间的相似度
  const similarPairs: SimilarFolderPair[] = [];

  for (let i = 0; i < dirs.length; i++) {
    for (let j = i + 1; j < dirs.length; j++) {
      const dir1Cache = dirCache.get(dirs[i]);
      const dir2Cache = dirCache.get(dirs[j]);
      const similarity = await bmsDirSimilarity(
        dirs[i],
        dirs[j],
        dir1Cache?.entries,
        dir2Cache?.entries
      );

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
