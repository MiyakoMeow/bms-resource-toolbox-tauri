#![recursion_limit = "512"]

pub mod bms;
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
            .plugin(tauri_plugin_dialog::init())
            .invoke_handler(tauri::generate_handler![
                // BMS commands
                options::bms::parse_bms_file,
                options::bms::parse_bmson_file,
                options::bms::get_dir_bms_list,
                options::bms::get_dir_bms_info,
                options::bms::is_work_dir,
                options::bms::is_root_dir,
                // FS commands
                options::fs::is_file_same_content,
                options::fs::is_dir_having_file,
                options::fs::remove_empty_folders,
                options::fs::bms_dir_similarity,
                // Work commands
                options::work::work_set_name_by_bms,
                options::work::work_undo_set_name_by_bms,
                options::work::work_remove_zero_sized_media_files,
                // Root commands
                options::root::root_set_name_by_bms,
                options::root::root_undo_set_name_by_bms,
                options::root::root_copy_numbered_workdir_names,
                options::root::root_scan_folder_similar_folders,
                options::root_bigpack::root_split_folders_with_first_char,
                options::root_bigpack::root_undo_split_pack,
                options::root_bigpack::root_merge_split_folders,
                options::root_bigpack::root_move_works_in_pack,
                options::root_bigpack::root_move_out_works,
                options::root_bigpack::root_move_works_with_same_name,
                options::root_bigpack::root_remove_unneed_media_files,
                // Pack commands
                options::pack::pack_raw_to_hq,
                options::pack::pack_hq_to_lq,
                options::pack::pack_setup_rawpack_to_hq,
                options::pack::pack_update_rawpack_to_hq,
                // Rawpack commands
                options::rawpack::rawpack_unzip_numeric_to_bms_folder,
                options::rawpack::rawpack_unzip_with_name_to_bms_folder,
                // Root event commands
                options::root_event::root_event_check_num_folder,
                options::root_event::root_event_create_num_folders,
                options::root_event::root_event_generate_work_info_table,
                // BMS event commands
                options::bms_event::bms_event_open_list,
                options::bms_event::bms_event_open_event_works,
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
