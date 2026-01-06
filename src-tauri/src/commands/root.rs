use std::path::PathBuf;

use crate::fs::moving::ReplacePreset;
use crate::options::root_bigpack::RemoveMediaPreset;
use crate::options::work::BmsFolderSetNameType;

/// Set directory name based on BMS file (root level)
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_set_name_by_bms(
    dir: String,
    set_type: BmsFolderSetNameType,
    dry_run: bool,
    replace: ReplacePreset,
    skip_already_formatted: bool,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root::set_name_by_bms(&path, set_type, dry_run, replace, skip_already_formatted)
        .await
        .map_err(|e| e.to_string())
}

/// Undo directory name setting (root level)
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_undo_set_name_by_bms(
    dir: String,
    set_type: BmsFolderSetNameType,
    dry_run: bool,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root::undo_set_name_by_bms(&path, set_type, dry_run)
        .await
        .map_err(|e| e.to_string())
}

/// Copy numbered work directory names
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_copy_numbered_workdir_names(
    from: String,
    to: String,
    dry_run: bool,
) -> Result<(), String> {
    let from_path = PathBuf::from(from);
    let to_path = PathBuf::from(to);
    crate::options::root::copy_numbered_workdir_names(&from_path, &to_path, dry_run)
        .await
        .map_err(|e| e.to_string())
}

/// Scan similar folders
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_scan_folder_similar_folders(
    dir: String,
    similarity: f64,
) -> Result<Vec<(String, String, f64)>, String> {
    let path = PathBuf::from(dir);
    crate::options::root::scan_folder_similar_folders(&path, similarity)
        .await
        .map_err(|e| e.to_string())
}

/// Split folders by first character
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_split_folders_with_first_char(dir: String, dry_run: bool) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_bigpack::split_folders_with_first_char(&path, dry_run)
        .await
        .map_err(|e| e.to_string())
}

/// Undo split pack
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_undo_split_pack(
    dir: String,
    dry_run: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_bigpack::undo_split_pack(&path, dry_run, replace)
        .await
        .map_err(|e| e.to_string())
}

/// Merge split folders
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_merge_split_folders(
    dir: String,
    dry_run: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_bigpack::merge_split_folders(&path, dry_run, replace)
        .await
        .map_err(|e| e.to_string())
}

/// Move works in pack
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_move_works_in_pack(
    from: String,
    to: String,
    dry_run: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let from_path = PathBuf::from(from);
    let to_path = PathBuf::from(to);
    crate::options::root_bigpack::move_works_in_pack(&from_path, &to_path, dry_run, replace)
        .await
        .map_err(|e| e.to_string())
}

/// Move out works
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_move_out_works(
    dir: String,
    dry_run: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_bigpack::move_out_works(&path, dry_run, replace)
        .await
        .map_err(|e| e.to_string())
}

/// Move works with same name
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_move_works_with_same_name(
    from: String,
    to: String,
    dry_run: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let from_path = PathBuf::from(from);
    let to_path = PathBuf::from(to);
    crate::options::root_bigpack::move_works_with_same_name(&from_path, &to_path, dry_run, replace)
        .await
        .map_err(|e| e.to_string())
}

/// Remove unnecessary media files
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_remove_unneed_media_files(
    dir: String,
    rule: RemoveMediaPreset,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    let rule_config = crate::options::root_bigpack::get_remove_media_rule_by_preset(rule);
    crate::options::root_bigpack::remove_unneed_media_files(&path, rule_config)
        .await
        .map_err(|e| e.to_string())
}
