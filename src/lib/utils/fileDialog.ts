/**
 * 文件对话框工具
 *
 * 封装 Tauri Dialog 插件，提供文件和目录选择功能
 */

import { open } from '@tauri-apps/plugin-dialog';

/**
 * 选择目录
 *
 * @returns 选中的目录路径，如果用户取消则返回 null
 */
export async function selectDirectory(): Promise<string | null> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择目录',
    });

    return typeof selected === 'string' ? selected : null;
  } catch (error) {
    console.error('选择目录失败:', error);
    return null;
  }
}

/**
 * 选择文件
 *
 * @param extensions - 文件扩展名列表（例如：['txt', 'md']）
 * @returns 选中的文件路径，如果用户取消则返回 null
 */
export async function selectFile(extensions?: string[]): Promise<string | null> {
  try {
    const selected = await open({
      multiple: false,
      title: '选择文件',
      filters: extensions ? [{ name: 'Files', extensions }] : undefined,
    });

    return typeof selected === 'string' ? selected : null;
  } catch (error) {
    console.error('选择文件失败:', error);
    return null;
  }
}

/**
 * 选择多个文件
 *
 * @param extensions - 文件扩展名列表
 * @returns 选中的文件路径数组，如果用户取消则返回空数组
 */
export async function selectMultipleFiles(extensions?: string[]): Promise<string[]> {
  try {
    const selected = await open({
      multiple: true,
      title: '选择文件',
      filters: extensions ? [{ name: 'Files', extensions }] : undefined,
    });

    if (Array.isArray(selected)) {
      return selected as string[];
    }

    return selected ? [selected as string] : [];
  } catch (error) {
    console.error('选择多个文件失败:', error);
    return [];
  }
}

/**
 * 保存文件对话框
 *
 * @param defaultPath - 默认文件路径
 * @param extensions - 文件扩展名列表
 * @returns 保存的文件路径，如果用户取消则返回 null
 */
export async function saveFile(defaultPath = '', extensions?: string[]): Promise<string | null> {
  try {
    const selected = await open({
      save: true,
      title: '保存文件',
      defaultPath,
      filters: extensions ? [{ name: 'Files', extensions }] : undefined,
    });

    return typeof selected === 'string' ? selected : null;
  } catch (error) {
    console.error('保存文件失败:', error);
    return null;
  }
}
