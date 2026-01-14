/**
 * 危险命令标记
 *
 * 根据文件系统修改的风险程度标记命令
 * 危险命令会默认启用 dry_run 模式
 */

/**
 * 危险命令：会修改文件系统的命令
 * 这些命令默认 dry_run = true
 */
export const DANGEROUS_COMMANDS = new Set([
  // Work 组
  'work_set_name_by_bms',
  'work_undo_set_name_by_bms',
  'work_remove_zero_sized_media_files',

  // Root 组
  'root_set_name_by_bms',
  'root_undo_set_name_by_bms',
  'root_copy_numbered_workdir_names',

  // Big Pack 组
  'root_split_folders_with_first_char',
  'root_undo_split_pack',
  'root_merge_split_folders',
  'root_move_works_in_pack',
  'root_move_out_works',
  'root_move_works_with_same_name',
  'root_remove_unneed_media_files',

  // Pack 组
  'pack_raw_to_hq',
  'pack_hq_to_lq',
  'pack_setup_rawpack_to_hq',
  'pack_update_rawpack_to_hq',

  // Rawpack 组
  'rawpack_unzip_numeric_to_bms_folder',
  'rawpack_unzip_with_name_to_bms_folder',

  // Root Event 组
  'root_event_create_num_folders',
  'root_event_generate_work_info_table',

  // FS 组
  'remove_empty_folders',
]);

/**
 * 安全命令：只读取信息的命令
 * 这些命令不需要 dry_run（或没有 dry_run 参数）
 */
export const SAFE_COMMANDS = new Set([
  // BMS 组
  'parse_bms_file',
  'parse_bmson_file',
  'get_dir_bms_list',
  'get_dir_bms_info',
  'is_work_dir',
  'is_root_dir',

  // FS 组
  'is_file_same_content',
  'is_dir_having_file',
  'bms_dir_similarity',

  // Root 组
  'root_scan_folder_similar_folders',

  // Root Event 组
  'root_event_check_num_folder',

  // BMS Event 组
  'bms_event_open_list',
  'bms_event_open_event_works',
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
