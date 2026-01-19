/**
 * 大包拆分和合并工具
 * 从 Python 代码迁移：legacy/options/bms_folder_bigpack.py
 */

import { mkdir, readDir, remove, rename, stat } from '@tauri-apps/plugin-fs';
import { moveElementsAcrossDir, replaceOptionsFromPreset, ReplacePreset } from '../fs/moving';

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
  {
    name: '0-9',
    match: (name) => '0' <= name[0].toUpperCase() && name[0].toUpperCase() <= '9',
  },
  {
    name: 'ABCD',
    match: (name) => 'A' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'D',
  },
  {
    name: 'EFGHIJK',
    match: (name) => 'E' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'K',
  },
  {
    name: 'LMNOPQ',
    match: (name) => 'L' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'Q',
  },
  {
    name: 'RST',
    match: (name) => 'R' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'T',
  },
  {
    name: 'UVWXYZ',
    match: (name) => 'U' <= name[0].toUpperCase() && name[0].toUpperCase() <= 'Z',
  },
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
    if (!entry.name) {
      continue;
    }
    if (!entry.isDirectory) {
      continue; // 跳过文件，只处理目录
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
    const entries = await readDir(rootDir);
    const hasContent = entries.length > 0;
    if (!hasContent) {
      await remove(rootDir, { recursive: true });
    }
  }
}

/**
 * 撤销拆分
 * 对应 Python: undo_split_pack (bms_folder_bigpack.py:68-83)
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 撤销拆分
 * @description 撤销按首字符拆分的操作，将所有子文件夹移回根目录
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function undoSplitPack(rootDir: string, dryRun: boolean): Promise<void> {
  const entries = await readDir(rootDir);

  // 获取所有规则名称
  const ruleNames = FIRST_CHAR_RULES.map((r) => r.name);

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) {
      continue;
    }

    // 检查是否为规则定义的目录名（支持多字符如 "0-9", "ABCD", "平假名"）
    if (!ruleNames.includes(entry.name)) {
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

    // 删除空的规则目录
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
 * 对应 Python: move_works_in_pack (bms_folder_bigpack.py:152-179)
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 移动包内作品
 * @description 将目录A下的作品，移动到目录B（自动合并）
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {string} targetPackName - 目标包名称
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
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
 * 对应 Python: move_out_works (bms_folder_bigpack.py:286-301)
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 移出一层目录
 * @description 将子包中的作品移出，合并到根目录
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {string} sourcePackName - 源包名称
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
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
 * 合并同名作品（在同一目录内）
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 合并同名作品
 * @description 合并同一目录中名称相同的文件夹
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function mergeFoldersWithSameNameWithinDir(
  rootDir: string,
  dryRun: boolean
): Promise<void> {
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
        await remove(sourceFolder, { recursive: true }).catch(() => {});
      }
    }
  }
}

/**
 * 移动作品包（匹配 Python 版本接口）
 * 对应 Python: move_works_in_pack (bms_folder_bigpack.py:152-179)
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 移动作品包
 * @description 将目录A下的作品，移动到目录B（自动合并）
 * @frontend true
 *
 * @param {string} fromDir - 源目录路径
 * @param {string} toDir - 目标目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 */
export async function moveWorksInPackPython(
  fromDir: string,
  toDir: string,
  dryRun: boolean
): Promise<void> {
  const entries = await readDir(fromDir);
  let moveCount = 0;

  for (const entry of entries) {
    if (!entry.isDirectory || !entry.name) {
      continue;
    }

    console.log(`Moving: ${entry.name}`);

    const fromPath = `${fromDir}/${entry.name}`;
    const toPath = `${toDir}/${entry.name}`;

    if (dryRun) {
      console.log(`[dry-run] Would move: ${fromPath} -> ${toPath}`);
    } else {
      await moveElementsAcrossDir(
        fromPath,
        toPath,
        replaceOptionsFromPreset(ReplacePreset.UpdatePack)
      );
    }

    moveCount++;
  }

  if (moveCount > 0) {
    console.log(`Move ${moveCount} songs.`);
  }
}

/**
 * 移动同名作品到平级目录
 * 对应 Python: move_works_with_same_name_to_siblings (bms_folder_bigpack.py:360-419)
 *
 * 将目录中文件名相似的子文件夹合并到各平级目录中
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 移动同名作品到平级目录
 * @description 将目录中文件名相似的子文件夹合并到各平级目录中
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // 假设有以下目录结构：
 * // BOFTT/
 * //   001. Title1 [Artist1]/
 * //   002. Title2 [Artist2]/
 * // BOFTT_Update/
 * //   001. Title1 [Artist1]/
 * //   002. Title2 [Artist2]/
 * //   003. Title3 [Artist3]/
 *
 * // 运行后将把 BOFTT_Update 中 001 和 002 的内容合并到 BOFTT 对应的目录中
 * await moveWorksWithSameNameToSiblings('D:/Packs/BOFTT_Update', false);
 * ```
 */
export async function moveWorksWithSameNameToSiblings(
  rootDir: string,
  dryRun: boolean
): Promise<void> {
  // 验证输入路径
  try {
    const metadata = await stat(rootDir);
    if (!metadata.isDirectory) {
      throw new Error(`路径不是目录: ${rootDir}`);
    }
  } catch {
    throw new Error(`路径不存在或不是目录: ${rootDir}`);
  }

  // 获取父目录路径
  const pathParts = rootDir.split(/[/\\]/);
  const baseName = pathParts.pop() || '';
  const parentDir = pathParts.join('/') || rootDir;

  if (!baseName) {
    console.error('无法提取目录名称');
    return;
  }

  // 获取源目录中的所有直接子文件夹
  const fromEntries = await readDir(rootDir);
  const fromSubdirs = fromEntries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  console.log(`源目录 ${rootDir} 中有 ${fromSubdirs.length} 个子文件夹`);

  // 获取同级目录列表（排除自身）
  const parentEntries = await readDir(parentDir);
  const siblingNames = parentEntries
    .filter((e) => e.isDirectory && e.name && e.name !== baseName)
    .map((e) => e.name!);

  console.log(`父目录 ${parentDir} 中有 ${siblingNames.length} 个同级目录`);

  // 收集合并对： (fromDirPath, targetPath)
  const pairs: Array<{ from: string; target: string; sibling: string }> = [];

  // 遍历同级目录
  for (const siblingName of siblingNames) {
    const siblingPath = `${parentDir}/${siblingName}`;

    // 获取该同级目录中的直接子目录
    const siblingEntries = await readDir(siblingPath);
    const toSubdirs = siblingEntries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

    // 查找匹配的子文件夹
    for (const fromDirName of fromSubdirs) {
      // 查找同级目录中是否包含源文件夹名的子文件夹
      for (const toDirName of toSubdirs) {
        if (fromDirName.includes(toDirName) || toDirName.includes(fromDirName)) {
          const fromPath = `${rootDir}/${fromDirName}`;
          const toPath = `${siblingPath}/${toDirName}`;
          pairs.push({ from: fromPath, target: toPath, sibling: siblingName });
          console.log(`  找到匹配: ${fromDirName} -> ${siblingName}/${toDirName}`);
          break;
        }
      }
    }
  }

  if (pairs.length === 0) {
    console.log('未找到可合并的文件夹对');
    return;
  }

  console.log(`\n找到 ${pairs.length} 个合并操作：`);
  for (const { from, target, sibling } of pairs) {
    const fromName = from.split(/[/\\]/).pop() || '';
    const toName = target.split(/[/\\]/).pop() || '';
    console.log(`  ${fromName} => ${sibling}/${toName}`);
  }

  if (dryRun) {
    console.log('\n[dry-run] 跳过实际合并操作');
    return;
  }

  console.log('\n开始合并...');

  // 执行合并
  for (const { from, target } of pairs) {
    const fromName = from.split(/[/\\]/).pop() || '';
    const targetName = target.split(/[/\\]/).pop() || '';

    console.log(`  合并: '${fromName}' -> '${targetName}'`);

    await moveElementsAcrossDir(from, target, replaceOptionsFromPreset(ReplacePreset.Default));
  }

  console.log(`\n合并完成，共 ${pairs.length} 个操作`);
}

/**
 * 合并同名作品到指定目录
 * 对应 Python: move_works_with_same_name (bms_folder_bigpack.py:304-358)
 *
 * 将源文件夹中的子文件夹合并到目标文件夹中的对应子文件夹。
 * 规则：
 * 1. 对于 fromDir 中的每个子文件夹 A
 * 2. 在 toDir 中查找名称包含 A 的子文件夹 B
 * 3. 如果找到，将 A 的内容合并到 B 中
 * 4. 递归处理子文件夹内的文件结构
 *
 * @command
 * @category bigpack
 * @dangerous true
 * @name 合并同名作品
 * @description 将源文件夹中名称相似的子文件夹合并到目标文件夹中的对应子文件夹
 * @frontend true
 *
 * @param {string} fromDir - 源文件夹路径
 * @param {string} toDir - 目标文件夹路径
 * @param {boolean} dryRun - 模拟运行（不实际执行）
 *
 * @returns {Promise<void>}
 *
 * @example
 * ```typescript
 * // 假设有以下目录结构：
 * // BOFTT_Original/
 * //   001. Title1 [Artist1]/
 * //   002. Title2 [Artist2]/
 * // BOFTT_Update/
 * //   001. Title1 [Artist1] v2/
 * //   002. Title2 [Artist2] v2/
 *
 * // 运行后将把 Original 中的文件夹合并到 Update 中名称包含的文件夹
 * await moveWorksWithSameName('D:/Packs/BOFTT_Original', 'D:/Packs/BOFTT_Update', false);
 * ```
 */
export async function moveWorksWithSameName(
  fromDir: string,
  toDir: string,
  dryRun: boolean
): Promise<void> {
  // 验证输入路径
  try {
    const fromMetadata = await stat(fromDir);
    if (!fromMetadata.isDirectory) {
      throw new Error(`源路径不是目录: ${fromDir}`);
    }
  } catch {
    throw new Error(`源路径不存在或不是目录: ${fromDir}`);
  }

  try {
    const toMetadata = await stat(toDir);
    if (!toMetadata.isDirectory) {
      throw new Error(`目标路径不是目录: ${toDir}`);
    }
  } catch {
    throw new Error(`目标路径不存在或不是目录: ${toDir}`);
  }

  // 获取源目录中的所有直接子文件夹
  const fromEntries = await readDir(fromDir);
  const fromSubdirs = fromEntries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  console.log(`源目录 ${fromDir} 中有 ${fromSubdirs.length} 个子文件夹`);

  // 获取目标目录中的所有直接子文件夹
  const toEntries = await readDir(toDir);
  const toSubdirs = toEntries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  console.log(`目标目录 ${toDir} 中有 ${toSubdirs.length} 个子文件夹`);

  // 收集合并对： (fromDirName, fromDirPath, toDirName, toDirPath)
  const pairs: Array<{ fromDirName: string; fromPath: string; toDirName: string; toPath: string }> =
    [];

  // 遍历源目录的每个子文件夹
  for (const fromDirName of fromSubdirs) {
    const fromPath = `${fromDir}/${fromDirName}`;

    // 查找匹配的目标子文件夹（名称包含源文件夹名）
    for (const toDirName of toSubdirs) {
      if (
        fromDirName === toDirName ||
        toDirName.includes(fromDirName) ||
        fromDirName.includes(toDirName)
      ) {
        const toPath = `${toDir}/${toDirName}`;
        pairs.push({ fromDirName, fromPath, toDirName, toPath });
        break;
      }
    }
  }

  if (pairs.length === 0) {
    console.log('未找到可合并的文件夹对');
    return;
  }

  console.log(`\n找到 ${pairs.length} 个合并操作：`);
  for (const { fromDirName, toDirName } of pairs) {
    console.log(`  ${fromDirName} => ${toDirName}`);
  }

  if (dryRun) {
    console.log('\n[dry-run] 跳过实际合并操作');
    return;
  }

  console.log('\n开始合并...');

  // 将源文件夹内容合并到每个匹配的目标文件夹
  for (const { fromDirName, fromPath, toDirName, toPath } of pairs) {
    console.log(`  合并: '${fromDirName}' -> '${toDirName}'`);

    await moveElementsAcrossDir(fromPath, toPath, replaceOptionsFromPreset(ReplacePreset.Default));

    // 删除空源目录
    try {
      const fromEntriesAfter = await readDir(fromPath);
      if (fromEntriesAfter.length === 0) {
        await remove(fromPath, { recursive: true });
        console.log(`    已删除空目录: ${fromDirName}`);
      }
    } catch (error) {
      console.warn(`    删除目录失败: ${fromDirName}`, error);
    }
  }

  console.log(`\n合并完成，共 ${pairs.length} 个操作`);
}
