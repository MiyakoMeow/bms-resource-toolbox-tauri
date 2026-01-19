/**
 * 危险命令标记
 *
 * 根据文件系统修改的风险程度标记命令
 * 危险命令会默认启用 dry_run 模式
 */

/**
 * 危险命令：会修改文件系统的命令
 * 这些命令默认 dry_run = true
 *
 * 注意：只包含已实际实现的命令
 */
export const DANGEROUS_COMMANDS = new Set([
  // Work 组
  'work_set_name_by_bms',
  'work_undo_set_name_by_bms',
  'work_remove_zero_sized_media_files',
  'work_remove_unneed_media_files',

  // Root 组
  'root_root_set_name_by_bms',
  'root_root_undo_set_name_by_bms',
  'root_copy_numbered_workdir_names',

  // FS 组
  'remove_empty_folders',
]);

/**
 * 安全命令：只读取信息的命令
 * 这些命令不需要 dry_run（或没有 dry_run 参数）
 *
 * 注意：只包含已实际实现的命令
 */
export const SAFE_COMMANDS = new Set([
  // BMS 组
  'read_and_parse_bms_file',
  'get_dir_bms_list',
  'get_dir_bms_info',
  'is_work_dir',
  'is_root_dir',

  // FS 组
  'is_dir_having_file',
]);

/**
 * 判断命令是否为危险命令
 */
export function isDangerousCommand(commandId: string): boolean {
  return DANGEROUS_COMMANDS.has(commandId);
}

/**
 * 判断命令是否为安全命令
 */
export function isSafeCommand(commandId: string): boolean {
  return SAFE_COMMANDS.has(commandId);
}
