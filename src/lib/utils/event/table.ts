/**
 * Excel 表格生成工具
 * 使用 xlsx 库生成 Excel 文件
 */

import { writeFile } from '@tauri-apps/plugin-fs';
import type { WorkInfoRow } from './folder.js';

/**
 * 生成 Excel 工作信息表
 */
export async function generateWorkInfoExcel(
  workInfoList: WorkInfoRow[],
  outputPath: string
): Promise<void> {
  // 动态导入 xlsx
  const XLSX = await import('xlsx');

  // 准备数据
  const data = [
    ['编号', '文件夹名', '标题', '艺术家', '流派'],
  ];

  for (const workInfo of workInfoList) {
    data.push([
      workInfo.num.toString(),
      workInfo.folderName,
      workInfo.title || '',
      workInfo.artist || '',
      workInfo.genre || '',
    ]);
  }

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 生成 Excel 缓冲区
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

  // 写入文件
  await writeFile(outputPath, new Uint8Array(excelBuffer as ArrayBuffer));

  console.log(`Generated Excel file: ${outputPath}`);
}
