/**
 * 大包拆分和合并工具
 * 从 Python 代码迁移：legacy/options/bms_folder_bigpack.py
 */

import { readDir, mkdir, rename, remove } from '@tauri-apps/plugin-fs';
import {
  moveElementsAcrossDir,
  replaceOptionsFromPreset,
  ReplacePreset,
} from '$lib/utils/fs/moving.js';
import { isDirHavingFile } from '$lib/utils/fs/compare.js';

// 正则表达式
const RE_JAPANESE_HIRAGANA = /[\u3040-\u309f]/;
const RE_JAPANESE_KATAKANA = /[\u30a0-\u30ff]/;
const RE_CHINESE_CHARACTER = /[\u4e00-\u9fa5]/;

/**
 * 首字符规则类型
 */
interface FirstCharRule {
  /** 分类名称 */
  name: string;
  /** 匹配函数 */
  match: (name: string) => boolean;
}

/**
 * 默认首字符规则
 * 对应 Python: FIRST_CHAR_RULES (bms_folder_bigpack.py:21-32)
 */
const FIRST_CHAR_RULES: FirstCharRule[] = [
  { name: '0-9', match: (name) => '0' <= name[0].toUpperCase() && name[0].toUpperCase() <= '9' },
  { name: 'ABCD', match: (name) => 'A' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'D' },
  {
    name: 'EFGHIJK',
    match: (name) => 'E' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'K',
  },
  { name: 'LMNOPQ', match: (name) => 'L' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'Q' },
  { name: 'RST', match: (name) => 'R' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'T' },
  { name: 'UVWXYZ', match: (name) => 'U' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'Z' },
  { name: '平假名', match: (name) => RE_JAPANESE_HIRAGANA.test(name[0]) },
  { name: '片假名', match: (name) => RE_JAPANESE_KATAKANA.test(name[0]) },
  { name: '汉字', match: (name) => RE_CHINESE_CHARACTER.test(name[0]) },
  { name: '+', match: (name) => name.length > 0 }, // 其他所有情况
];

/**
 * 根据首字符规则查找分类
 * 对应 Python: _first_char_rules_find (bms_folder_bigpack.py:35-40)
 *
 * @param name - 文件名
 * @returns 分类名称
 */
function findFirstCharRule(name: string): string {
  for (const rule of FIRST_CHAR_RULES) {
    if (!rule.match(name)) {
      continue;
    }
    return rule.name;
  }
  return '未分类';
}

/**
 * 按首字符拆分文件夹
 * 对应 Python: split_folders_with_first_char (bms_folder_bigpack.py:43-65)
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 按首字符拆分文件夹
 * @description 将目录下的作品按照首字符规则分成多个文件夹
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 是否模拟运行
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * await splitFoldersWithFirstChar('/path/to/packs', false);
 * // 会创建类似 "0-9", "ABCD", "平假名", "汉字" 等子目录
 * ```
 */
export async function splitFoldersWithFirstChar(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);
  const rootFolderName = rootDir.split('/').pop() || rootDir.split('\\').pop() || rootDir;

  // 检查是否以 ']' 结尾
  if (rootFolderName.endsWith(']')) {
    console.log(`${rootDir} ends with ']', aborting...`);
    return;
  }

  const charMap = new Map<string, string[]>();

  // 按首字符规则分组
  for (const entry of entries) {
    if (entry.isDirectory || !entry.name) {
      continue; // 跳过文件
    }

    const groupName = findFirstCharRule(entry.name);

    if (!charMap.has(groupName)) {
      charMap.set(groupName, []);
    }

    charMap.get(groupName)!.push(`${rootDir}/${entry.name}`);
  }

  // 创建拆分目录
  for (const [groupName, folders] of charMap) {
    const targetDir = `${rootDir}/${groupName}`;

    if (!dryRun) {
      await mkdir(targetDir, { recursive: true });
    }

    console.log(`Processing ${groupName}: ${folders.length} folders`);

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

  // 移除原始文件夹（如果可能）
  if (!dryRun) {
    const hasFile = await isDirHavingFile(rootDir);
    if (!hasFile) {
      await remove(rootDir, { recursive: true });
    }
  }
}

/**
 * 撤销拆分
 */
export async function undoSplitPack(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) {
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
      if (!subEntry.isDirectory || !subEntry.name) {
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
 * 合并拆分的文件夹（撤销拆分）
 */
export async function undoSplitAndMerge(rootDir: string, dryRun: boolean): Promise<void> {
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
    if (!entry.isDirectory || !entry.name) {
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
    if (!entry.isDirectory || !entry.name) {
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
export async function moveWorksWithSameName(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);
  const nameMap = new Map<string, string[]>();

  // 按名称分组（忽略编号）
  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) {
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
