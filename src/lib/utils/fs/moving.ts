/**
 * 跨目录文件移动工具（含冲突处理）
 */

import { exists, readDir, remove, rename, stat } from '@tauri-apps/plugin-fs';
import { isDirHavingFile, isFileSameContent } from './compare';

/**
 * 替换操作类型
 */
export enum ReplaceAction {
  Skip = 0,
  Replace = 1,
  Rename = 2,
  CheckReplace = 12,
}

/**
 * 替换选项
 */
export interface ReplaceOptions {
  /** 按扩展名指定的策略 */
  ext: Record<string, ReplaceAction>;
  /** 默认策略 */
  default: ReplaceAction;
}

/**
 * 替换预设
 */
export enum ReplacePreset {
  Default = 0,
  UpdatePack = 1,
}

/**
 * 从预设获取替换选项
 */
export function replaceOptionsFromPreset(preset: ReplacePreset): ReplaceOptions {
  switch (preset) {
    case ReplacePreset.Default:
      return { ext: {}, default: ReplaceAction.Replace };
    case ReplacePreset.UpdatePack:
      return replaceOptionsUpdatePack();
  }
}

/**
 * 默认的更新包策略
 */
function replaceOptionsUpdatePack(): ReplaceOptions {
  return {
    ext: {
      bms: ReplaceAction.CheckReplace,
      bme: ReplaceAction.CheckReplace,
      bml: ReplaceAction.CheckReplace,
      pms: ReplaceAction.CheckReplace,
      bmson: ReplaceAction.CheckReplace,
      txt: ReplaceAction.CheckReplace,
    },
    default: ReplaceAction.Replace,
  };
}

/**
 * 获取特定文件的替换策略
 */
async function getActionForPath(options: ReplaceOptions, filePath: string): Promise<ReplaceAction> {
  const { getFileExtension } = await import('./path');
  const ext = getFileExtension(filePath);
  return options.ext[ext] ?? options.default;
}

/**
 * 递归移动目录内容
 */
export async function moveElementsAcrossDir(
  fromDir: string,
  toDir: string,
  replaceOptions: ReplaceOptions
): Promise<void> {
  // 检查源目录元数据
  let fromMeta;
  try {
    fromMeta = await stat(fromDir);
  } catch {
    // 源目录不存在，直接返回
    return;
  }

  // 源和目标相同，跳过
  if (fromDir === toDir) {
    return;
  }

  // 源不是目录，跳过
  if (!fromMeta.isDirectory) {
    return;
  }

  // 检查目标目录
  const toExists = await exists(toDir);

  if (!toExists) {
    // 目标不存在，直接重命名整个目录
    await rename(fromDir, toDir);
    return;
  }

  // 目标存在但不是目录
  const toMeta = await stat(toDir);
  if (!toMeta.isDirectory) {
    throw new Error('目标路径存在且不是目录');
  }

  // 使用队列管理待处理的目录
  const queue: [string, string][] = [[fromDir, toDir]];

  while (queue.length > 0) {
    const [currentFrom, currentTo] = queue.shift()!;

    // 处理当前目录
    const subdirs = await processDirectory(currentFrom, currentTo, replaceOptions);

    // 将发现的子目录加入队列
    queue.push(...subdirs);

    // 清理空目录
    const hasFiles = await isDirHavingFile(currentFrom);
    const skipCleanup = replaceOptions.default === ReplaceAction.Skip && hasFiles;

    if (!skipCleanup) {
      try {
        await remove(currentFrom, { recursive: true });
      } catch (error) {
        console.warn(`权限不足，无法删除 ${currentFrom}:`, error);
      }
    }
  }
}

/**
 * 处理单个目录，返回需要进一步处理的子目录
 */
async function processDirectory(
  fromDir: string,
  toDir: string,
  replaceOptions: ReplaceOptions
): Promise<[string, string][]> {
  const subdirs: [string, string][] = [];

  // 收集目录条目
  const entries = await readDir(fromDir);
  const pairs: Array<{ src: string; dst: string; name: string }> = [];

  for (const entry of entries) {
    if (!entry.name) continue;

    pairs.push({
      src: `${fromDir}/${entry.name}`,
      dst: `${toDir}/${entry.name}`,
      name: entry.name,
    });
  }

  // 预取元数据（并发）
  const metas = await Promise.all(
    pairs.map(async (pair) => {
      try {
        const srcMeta = await stat(pair.src);
        let dstMeta;
        try {
          dstMeta = await stat(pair.dst);
        } catch {
          dstMeta = null;
        }

        return { ...pair, srcMeta, dstMeta };
      } catch {
        return { ...pair, srcMeta: null, dstMeta: null };
      }
    })
  );

  // 分类
  const subdirBothExist: [string, string][] = [];
  const dirDirectMoves: [string, string][] = [];
  const fileSkipOps: Array<{ src: string; dst: string }> = [];
  const fileRenameOps: Array<{ src: string; dst: string }> = [];
  const fileReplaceOps: Array<{ src: string; dst: string }> = [];

  for (const { src, dst, srcMeta, dstMeta } of metas) {
    if (!srcMeta) continue;

    if (srcMeta.isDirectory) {
      if (dstMeta && dstMeta.isDirectory) {
        subdirBothExist.push([src, dst]);
      } else {
        dirDirectMoves.push([src, dst]);
      }
    } else if (srcMeta.isFile) {
      const action = await getActionForPath(replaceOptions, src);

      switch (action) {
        case ReplaceAction.Skip:
          fileSkipOps.push({ src, dst });
          break;
        case ReplaceAction.Rename:
          fileRenameOps.push({ src, dst });
          break;
        default:
          fileReplaceOps.push({ src, dst });
          break;
      }
    }
  }

  // Stage 1: 双边都存在的子目录 -> 加入队列
  subdirs.push(...subdirBothExist);

  // Stage 2a: 目录直接移动（并发）
  await Promise.all(
    dirDirectMoves.map(async ([src, dst]) => {
      try {
        await rename(src, dst);
      } catch (error) {
        console.warn(`Failed to move directory ${src} -> ${dst}:`, error);
      }
    })
  );

  // Stage 2b: 文件 Skip 操作（并发）
  await Promise.all(
    fileSkipOps.map(async ({ src, dst }) => {
      const dstExists = await exists(dst);
      if (dstExists) {
        return; // 跳过
      }
      await moveFile(src, dst, replaceOptions);
    })
  );

  // Stage 2c: 文件 Rename 操作（并发）
  await Promise.all(
    fileRenameOps.map(async ({ src, dst }) => {
      await moveFileRename(src, dst);
    })
  );

  // Stage 3: 剩余的覆盖操作（Replace / CheckReplace）（并发）
  await Promise.all(
    fileReplaceOps.map(async ({ src, dst }) => {
      await moveFile(src, dst, replaceOptions);
    })
  );

  return subdirs;
}

/**
 * 移动单个文件，根据策略处理冲突
 */
async function moveFile(src: string, dst: string, options: ReplaceOptions): Promise<void> {
  const action = await getActionForPath(options, src);

  switch (action) {
    case ReplaceAction.Replace:
      await rename(src, dst);
      break;

    case ReplaceAction.Skip:
      if (await exists(dst)) {
        return; // 跳过
      }
      await rename(src, dst);
      break;

    case ReplaceAction.Rename:
      await moveFileRename(src, dst);
      break;

    case ReplaceAction.CheckReplace:
      if (await exists(dst)) {
        const same = await isFileSameContent(src, dst);
        if (same) {
          // 内容相同，直接覆盖
          await rename(src, dst);
        } else {
          // 内容不同，重命名
          await moveFileRename(src, dst);
        }
      } else {
        await rename(src, dst);
      }
      break;
  }
}

/**
 * 重命名移动文件（带重试）
 */
async function moveFileRename(src: string, dstDir: string): Promise<void> {
  const srcFileName = src.split('/').pop() || src.split('\\').pop() || 'file';
  const { getFileStem, getFileExtension } = await import('./path');

  const stem = getFileStem(srcFileName);
  const ext = getFileExtension(srcFileName);

  let count = 0;
  while (true) {
    count++;

    const newName = count === 1 ? `${stem}.${ext}` : `${stem}.${count}.${ext}`;
    const dst = `${dstDir.split('/').slice(0, -1).join('/')}/${newName}`;

    if (!(await exists(dst))) {
      await rename(src, dst);
      return;
    }

    // 检查内容是否相同
    const same = await isFileSameContent(src, dst);
    if (same) {
      // 文件已存在且内容相同，删除源文件
      await remove(src);
      return;
    }

    if (count > 1000) {
      throw new Error('重复文件过多');
    }
  }
}
