/**
 * 大包拆分和合并工具
 */

import { readDir, mkdir, rename, exists, remove } from '@tauri-apps/plugin-fs';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '$lib/utils/fs/moving.js';

/**
 * 按首字符拆分文件夹
 */
export async function splitFoldersWithFirstChar(
  rootDir: string,
  dryRun: boolean
): Promise<void> {
  const entries = await readDir(rootDir);
  const charMap = new Map<string, string[]>();

  // 按首字符分组
  for (const entry of entries) {
    if (entry.children === undefined || !entry.name) {
      continue;
    }

    const firstChar = entry.name.charAt(0).toUpperCase();

    if (!charMap.has(firstChar)) {
      charMap.set(firstChar, []);
    }

    charMap.get(firstChar)!.push(`${rootDir}/${entry.name}`);
  }

  // 创建拆分目录
  for (const [char, folders] of charMap) {
    const targetDir = `${rootDir}/${char}`;

    if (!dryRun) {
      await mkdir(targetDir, { recursive: true });
    }

    console.log(`Processing ${char}: ${folders.length} folders`);

    // 移动文件夹
    for (const folder of folders) {
      const folderName = folder.split('/').pop() || folder.split('\\').pop() || folder;
      const targetPath = `${targetDir}/${folderName}`;

      if (dryRun) {
        console.log(`[dry-run] Would move: ${folder} -> ${targetPath}`);
      } else {
        await rename(folder, targetPath);
      }
    }
  }
}

/**
 * 撤销拆分
 */
export async function undoSplitPack(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (entry.children === undefined || !entry.name) {
      continue;
    }

    // 检查是否为单字符目录名
    if (entry.name.length !== 1) {
      continue;
    }

    const charDir = `${rootDir}/${entry.name}`;

    // 移动所有子目录到根目录
    const subEntries = await readDir(charDir);

    for (const subEntry of subEntries) {
      if (subEntry.children === undefined || !subEntry.name) {
        continue;
      }

      const sourcePath = `${charDir}/${subEntry.name}`;
      const targetPath = `${rootDir}/${subEntry.name}`;

      if (dryRun) {
        console.log(`[dry-run] Would move: ${sourcePath} -> ${targetPath}`);
      } else {
        await rename(sourcePath, targetPath);
      }
    }

    // 删除空的单字符目录
    if (!dryRun) {
      await remove(charDir, { recursive: true });
    }
  }
}

/**
 * 合并拆分的文件夹
 */
export async function mergeSplitFolders(
  rootDir: string,
  dryRun: boolean
): Promise<void> {
  // 类似于撤销拆分
  await undoSplitPack(rootDir, dryRun);
}

/**
 * 移动包内的作品
 */
export async function moveWorksInPack(
  rootDir: string,
  targetPackName: string,
  dryRun: boolean
): Promise<void> {
  const targetDir = `${rootDir}/${targetPackName}`;

  if (!dryRun) {
    await mkdir(targetDir, { recursive: true });
  }

  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (entry.children === undefined || !entry.name) {
      continue;
    }

    // 跳过目标目录
    if (entry.name === targetPackName) {
      continue;
    }

    const sourcePath = `${rootDir}/${entry.name}`;
    const targetPath = `${targetDir}/${entry.name}`;

    if (dryRun) {
      console.log(`[dry-run] Would move: ${sourcePath} -> ${targetPath}`);
    } else {
      await rename(sourcePath, targetPath);
    }
  }
}

/**
 * 移出作品
 */
export async function moveOutWorks(
  rootDir: string,
  sourcePackName: string,
  dryRun: boolean
): Promise<void> {
  const sourceDir = `${rootDir}/${sourcePackName}`;

  const entries = await readDir(sourceDir);

  for (const entry of entries) {
    if (entry.children === undefined || !entry.name) {
      continue;
    }

    const sourcePath = `${sourceDir}/${entry.name}`;
    const targetPath = `${rootDir}/${entry.name}`;

    if (dryRun) {
      console.log(`[dry-run] Would move: ${sourcePath} -> ${targetPath}`);
    } else {
      await rename(sourcePath, targetPath);
    }
  }

  // 删除空目录
  if (!dryRun) {
    const subEntries = await readDir(sourceDir);
    if (subEntries.length === 0) {
      await remove(sourceDir, { recursive: true });
    }
  }
}

/**
 * 合并同名作品
 */
export async function moveWorksWithSameName(
  rootDir: string,
  dryRun: boolean
): Promise<void> {
  const entries = await readDir(rootDir);
  const nameMap = new Map<string, string[]>();

  // 按名称分组（忽略编号）
  for (const entry of entries) {
    if (entry.children === undefined || !entry.name) {
      continue;
    }

    const match = entry.name.match(/^\d+\s+(.+)$/);
    if (match) {
      const name = match[1];

      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }

      nameMap.get(name)!.push(`${rootDir}/${entry.name}`);
    }
  }

  // 合并同名文件夹
  for (const [name, folders] of nameMap) {
    if (folders.length <= 1) {
      continue;
    }

    // 使用第一个文件夹作为目标
    const targetFolder = folders[0];

    console.log(`Merging ${folders.length} folders with name: ${name}`);

    // 移动其他文件夹的内容到目标文件夹
    for (let i = 1; i < folders.length; i++) {
      const sourceFolder = folders[i];

      if (dryRun) {
        console.log(`[dry-run] Would merge: ${sourceFolder} -> ${targetFolder}`);
      } else {
        await moveElementsAcrossDir(
          sourceFolder,
          targetFolder,
          replaceOptionsFromPreset(ReplacePreset.Default)
        );

        // 删除空目录
        const { remove } = await import('@tauri-apps/plugin-fs');
        await remove(sourceFolder, { recursive: true }).catch(() => {});
      }
    }
  }
}
