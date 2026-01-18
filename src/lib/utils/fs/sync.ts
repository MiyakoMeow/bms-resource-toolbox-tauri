/**
 * 文件夹同步工具
 */

import { readDir, copyFile, rename, stat, exists, remove } from '@tauri-apps/plugin-fs';
import { getFileExtension } from './path.js';
import { isFileSameContent } from './compare.js';

/**
 * 同步执行类型
 */
export enum SoftSyncExec {
  None = 'None',
  Copy = 'Copy',
  Move = 'Move',
}

/**
 * 文件比较策略
 */
export interface FileCompareStrategy {
  checkSize: boolean;
  checkMtime: boolean;
  checkSha512: boolean;
}

/**
 * 清理策略
 */
export interface CleanupStrategy {
  removeDstExtra: boolean;
  removeSrcSame: boolean;
}

/**
 * 同步预设
 */
export interface SoftSyncPreset {
  name: string;
  allowSrcExts: string[];
  disallowSrcExts: string[];
  allowOtherExts: boolean;
  /** ([from_exts], [to_exts]) */
  noActivateExtBoundPairs: Array<[string[], string[]]>;
  cleanup: CleanupStrategy;
  fileCompare: FileCompareStrategy;
  exec: SoftSyncExec;
}

/**
 * 默认同步预设
 */
export function presetDefault(): SoftSyncPreset {
  return {
    name: 'Local file sync preset',
    allowSrcExts: [],
    disallowSrcExts: [],
    allowOtherExts: true,
    noActivateExtBoundPairs: [],
    cleanup: {
      removeDstExtra: true,
      removeSrcSame: false,
    },
    fileCompare: {
      checkSize: true,
      checkMtime: true,
      checkSha512: false,
    },
    exec: SoftSyncExec.Copy,
  };
}

/**
 * 用于追加更新的同步预设
 */
export function presetForAppend(): SoftSyncPreset {
  return {
    name: 'Sync preset (for update pack)',
    allowSrcExts: [],
    disallowSrcExts: [],
    allowOtherExts: true,
    noActivateExtBoundPairs: [],
    cleanup: {
      removeDstExtra: false,
      removeSrcSame: true,
    },
    fileCompare: {
      checkSize: true,
      checkMtime: false,
      checkSha512: true,
    },
    exec: SoftSyncExec.None,
  };
}

/**
 * FLAC 文件同步预设
 */
export function presetFlac(): SoftSyncPreset {
  return {
    name: 'FLAC sync preset',
    allowSrcExts: ['flac'],
    disallowSrcExts: [],
    allowOtherExts: false,
    noActivateExtBoundPairs: [],
    cleanup: {
      removeDstExtra: false,
      removeSrcSame: false,
    },
    fileCompare: {
      checkSize: true,
      checkMtime: true,
      checkSha512: false,
    },
    exec: SoftSyncExec.Copy,
  };
}

/**
 * MP4/AVI 视频同步预设
 */
export function presetMp4Avi(): SoftSyncPreset {
  return {
    name: 'MP4/AVI sync preset',
    allowSrcExts: ['mp4', 'avi'],
    disallowSrcExts: [],
    allowOtherExts: false,
    noActivateExtBoundPairs: [],
    cleanup: {
      removeDstExtra: false,
      removeSrcSame: false,
    },
    fileCompare: {
      checkSize: true,
      checkMtime: true,
      checkSha512: false,
    },
    exec: SoftSyncExec.Copy,
  };
}

/**
 * 缓存同步预设
 */
export function presetCache(): SoftSyncPreset {
  return {
    name: 'Cache sync preset',
    allowSrcExts: ['mp4', 'avi', 'flac'],
    disallowSrcExts: [],
    allowOtherExts: false,
    noActivateExtBoundPairs: [],
    cleanup: {
      removeDstExtra: false,
      removeSrcSame: false,
    },
    fileCompare: {
      checkSize: true,
      checkMtime: true,
      checkSha512: false,
    },
    exec: SoftSyncExec.None,
  };
}

/**
 * 递归同步文件夹
 */
export async function syncFolder(
  srcDir: string,
  dstDir: string,
  preset: SoftSyncPreset
): Promise<void> {
  const srcCopyFiles: string[] = [];
  const srcMoveFiles: string[] = [];
  const srcRemoveFiles: string[] = [];
  const dstRemoveFiles: string[] = [];
  const dstRemoveDirs: string[] = [];

  // 收集目录条目
  const [srcEntries, dstEntries] = await Promise.all([readDir(srcDir), readDir(dstDir)]);

  const srcMap = new Map<string, { entry: (typeof srcEntries)[0] }>();
  const dstMap = new Map<string, (typeof dstEntries)[0]>();

  for (const entry of srcEntries) {
    if (entry.name) srcMap.set(entry.name, { entry });
  }

  for (const entry of dstEntries) {
    if (entry.name) dstMap.set(entry.name, entry);
  }

  // 1. 处理源文件
  for (const [name, { entry }] of srcMap) {
    const srcPath = `${srcDir}/${name}`;
    const dstPath = `${dstDir}/${name}`;

    // 检查是否为目录
    if (entry.isDirectory) {
      if (!(await exists(dstPath))) {
        await createDirectory(dstPath);
      }
      // 递归同步子目录
      await syncFolder(srcPath, dstPath, preset);
      continue;
    }

    // 处理文件
    const ext = getFileExtension(name);

    // 扩展名验证
    let extOk = preset.allowOtherExts;
    if (preset.allowSrcExts.includes(ext)) {
      extOk = true;
    }
    if (preset.disallowSrcExts.includes(ext)) {
      extOk = false;
    }
    if (!extOk) {
      continue;
    }

    // 扩展名绑定检查
    let bound = false;
    for (const [from, to] of preset.noActivateExtBoundPairs) {
      if (from.includes(ext)) {
        for (const toExt of to) {
          const boundPath = dstPath.substring(0, dstPath.lastIndexOf('.')) + '.' + toExt;
          if (await exists(boundPath)) {
            bound = true;
            break;
          }
        }
      }
      if (bound) {
        break;
      }
    }
    if (bound) {
      continue;
    }

    // 检查目标文件
    const dstFileExists = await exists(dstPath);
    let same = dstFileExists;

    if (dstFileExists) {
      // 读取元数据
      const [srcMd, dstMd] = await Promise.all([stat(srcPath), stat(dstPath)]);

      if (preset.fileCompare.checkSize && same) {
        same = srcMd.size === dstMd.size;
      }

      if (preset.fileCompare.checkMtime && same) {
        const srcMtime = srcMd.mtime?.getTime() || 0;
        const dstMtime = dstMd.mtime?.getTime() || 0;
        same = srcMtime === dstMtime;
      }

      if (preset.fileCompare.checkSha512 && same) {
        same = await isFileSameContent(srcPath, dstPath);
      }
    }

    // 执行同步操作
    if (!dstFileExists || !same) {
      switch (preset.exec) {
        case SoftSyncExec.None:
          break;
        case SoftSyncExec.Copy:
          await copyFile(srcPath, dstPath);
          srcCopyFiles.push(name);
          break;
        case SoftSyncExec.Move:
          await rename(srcPath, dstPath);
          srcMoveFiles.push(name);
          break;
      }
    }

    // 清理源文件（如果需要）
    if (preset.cleanup.removeSrcSame && dstFileExists && same) {
      await remove(srcPath);
      srcRemoveFiles.push(name);
    }
  }

  // 2. 清理目标端的额外条目
  if (preset.cleanup.removeDstExtra) {
    for (const [name, entry] of dstMap) {
      const srcPath = `${srcDir}/${name}`;
      const dstPath = `${dstDir}/${name}`;

      if (!(await exists(srcPath))) {
        if (entry.isDirectory) {
          await remove(dstPath, { recursive: true });
          dstRemoveDirs.push(name);
        } else {
          await remove(dstPath);
          dstRemoveFiles.push(name);
        }
      }
    }
  }

  // 打印日志
  const hasAny =
    srcCopyFiles.length > 0 ||
    srcMoveFiles.length > 0 ||
    srcRemoveFiles.length > 0 ||
    dstRemoveFiles.length > 0 ||
    dstRemoveDirs.length > 0;

  if (hasAny) {
    console.log(`${srcDir} -> ${dstDir}:`);
    if (srcCopyFiles.length > 0) {
      console.log(`Src copy: ${srcCopyFiles}`);
    }
    if (srcMoveFiles.length > 0) {
      console.log(`Src move: ${srcMoveFiles}`);
    }
    if (srcRemoveFiles.length > 0) {
      console.log(`Src remove: ${srcRemoveFiles}`);
    }
    if (dstRemoveFiles.length > 0) {
      console.log(`Dst remove: ${dstRemoveFiles}`);
    }
    if (dstRemoveDirs.length > 0) {
      console.log(`Dst remove dir: ${dstRemoveDirs}`);
    }
  }
}

/**
 * 创建目录（包括父目录）
 */
async function createDirectory(dirPath: string): Promise<void> {
  const { mkdir } = await import('@tauri-apps/plugin-fs');
  await mkdir(dirPath, { recursive: true });
}
