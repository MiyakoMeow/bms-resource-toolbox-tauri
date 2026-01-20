/**
 * 活动管理工具
 */

import { exists, mkdir, readDir } from '@tauri-apps/plugin-fs';
import { getDirBmsInfo } from '../bms/scanner';

/**
 * 检查数字文件夹（1 到 max）哪些不存在
 * 对应 Python: check_num_folder (bms_folder_event.py:9-14)
 *
 * @command
 * @category BMSEvent
 * @dangerous false
 * @name 检查编号文件夹
 * @description 检查各个编号对应的文件夹是否存在
 * @frontend true
 *
 * @param {string} dir - 目录路径
 * @param {number} max - 最大编号
 *
 * @returns {Promise<string[]>} 缺失的文件夹路径列表
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
 * 对应 Python: create_num_folders (bms_folder_event.py:16-36)
 *
 * @command
 * @category BMSEvent
 * @dangerous true
 * @name 创建编号文件夹
 * @description 创建只带有编号的空文件夹
 * @frontend true
 *
 * @param {string} dir - 目录路径
 * @param {number} max - 最大编号
 *
 * @returns {Promise<void>}
 */
export async function createNumFolders(dir: string, max: number): Promise<void> {
  // 获取现有元素并过滤出目录
  const existingEntries = await readDir(dir);
  const existingDirs = existingEntries.filter((e) => e.isDirectory && e.name).map((e) => e.name!);

  for (let id = 1; id <= max; id++) {
    const newDirName = `${id}`;

    // 检查是否存在以该编号开头的文件夹（检查常见分隔符）
    const idExists = existingDirs.some(
      (elementName) =>
        elementName === newDirName ||
        elementName.startsWith(`${newDirName} `) ||
        elementName.startsWith(`${newDirName}.`) ||
        elementName.startsWith(`${newDirName}-`) ||
        elementName.startsWith(`${newDirName}_`)
    );

    if (idExists) {
      continue;
    }

    const newDirPath = `${dir}/${newDirName}`;

    if (!(await exists(newDirPath))) {
      await mkdir(newDirPath, { recursive: true });
      console.log(`Created folder: ${newDirPath}`);
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
 * 对应 Python: generate_work_info_table (bms_folder_event.py:39-68)
 *
 * @command
 * @category BMSEvent
 * @dangerous false
 * @name 生成作品信息表
 * @description 生成活动作品的xlsx表格数据
 * @frontend true
 *
 * @param {string} rootDir - 根目录路径
 *
 * @returns {Promise<WorkInfoRow[]>} 作品信息列表
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
