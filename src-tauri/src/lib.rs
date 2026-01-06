#![recursion_limit = "512"]

pub mod bms;
pub mod commands;
pub mod fs;
pub mod media;
pub mod options;

/// Run the Tauri application
///
/// # Errors
///
/// Returns an error if the Tauri application fails to start or run
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() -> Result<(), tauri::Error> {
    // Tauri internally uses process::exit on unrecoverable errors.
    // This is expected behavior for a GUI application and cannot be avoided
    // when using the Tauri framework.
    #[allow(clippy::exit)]
    {
        tauri::Builder::default()
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![
                // BMS commands
                commands::bms_parse_bms_file,
                commands::bms_parse_bmson_file,
                commands::bms_get_dir_bms_list,
                commands::bms_get_dir_bms_info,
                commands::bms_is_work_dir,
                commands::bms_is_root_dir,
                // FS commands
                commands::fs_is_file_same_content,
                commands::fs_is_dir_having_file,
                commands::fs_remove_empty_folders,
                commands::fs_bms_dir_similarity,
                // Work commands
                commands::work_set_name_by_bms,
                commands::work_undo_set_name_by_bms,
                commands::work_remove_zero_sized_media_files,
                // Root commands
                commands::root_set_name_by_bms,
                commands::root_undo_set_name_by_bms,
                commands::root_copy_numbered_workdir_names,
                commands::root_scan_folder_similar_folders,
                commands::root_split_folders_with_first_char,
                commands::root_undo_split_pack,
                commands::root_merge_split_folders,
                commands::root_move_works_in_pack,
                commands::root_move_out_works,
                commands::root_move_works_with_same_name,
                commands::root_remove_unneed_media_files,
                // Pack commands
                commands::pack_raw_to_hq,
                commands::pack_hq_to_lq,
                commands::pack_setup_rawpack_to_hq,
                commands::pack_update_rawpack_to_hq,
                // Rawpack commands
                commands::rawpack_unzip_numeric_to_bms_folder,
                commands::rawpack_unzip_with_name_to_bms_folder,
                // Root event commands
                commands::root_event_check_num_folder,
                commands::root_event_create_num_folders,
                commands::root_event_generate_work_info_table,
                // BMS event commands
                commands::bms_event_open_list,
                commands::bms_event_open_event_works,
            ])
            .setup(|_app| {
                #[cfg(debug_assertions)]
                {
                    println!("Setup called, Tauri will automatically create the window...");
                }

                Ok(())
            })
            .run(tauri::generate_context!())
    }
}
