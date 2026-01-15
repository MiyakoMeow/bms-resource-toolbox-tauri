/**
 * 活动管理工具
 */

import { readDir, mkdir, exists } from '@tauri-apps/plugin-fs';
import { getDirBmsInfo } from '$lib/utils/bms/scanner.js';

/**
 * 检查数字文件夹（1 到 max）哪些不存在
 */
export async function checkNumFolder(dir: string, max: number): Promise<string[]> {
  const missing: string[] = [];

  for (let i = 1; i <= max; i++) {
    const folderPath = `${dir}/${i}`;
    if (!(await exists(folderPath))) {
      missing.push(folderPath);
    }
  }

  return missing;
}

/**
 * 创建数字文件夹
 */
export async function createNumFolders(dir: string, max: number): Promise<void> {
  for (let i = 1; i <= max; i++) {
    const folderPath = `${dir}/${i}`;

    if (!(await exists(folderPath))) {
      await mkdir(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    }
  }
}

/**
 * 作品信息表行
 */
export interface WorkInfoRow {
  num: number;
  folderName: string;
  title?: string;
  artist?: string;
  genre?: string;
}

/**
 * 生成工作信息表
 */
export async function generateWorkInfoTable(rootDir: string): Promise<WorkInfoRow[]> {
  const entries = await readDir(rootDir);
  const workInfoList: WorkInfoRow[] = [];

  for (const entry of entries) {
    if (!entry.name) {
      continue;
    }

    // 提取编号
    const match = entry.name.match(/^(\d+)\s+(.+)$/);
    let num = 0;
    let folderName = entry.name;

    if (match) {
      num = parseInt(match[1], 10);
      folderName = match[2];
    }

    const workDir = `${rootDir}/${entry.name}`;
    const bmsInfo = await getDirBmsInfo(workDir);

    workInfoList.push({
      num,
      folderName,
      title: bmsInfo?.bms.musicInfo.title,
      artist: bmsInfo?.bms.musicInfo.artist,
      genre: bmsInfo?.bms.musicInfo.genre,
    });
  }

  // 按编号排序
  workInfoList.sort((a, b) => a.num - b.num);

  return workInfoList;
}
