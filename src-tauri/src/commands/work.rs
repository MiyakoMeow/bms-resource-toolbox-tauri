use std::path::PathBuf;

use crate::fs::moving::ReplacePreset;
use crate::options::work::BmsFolderSetNameType;

/// Set directory name based on BMS file
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn work_set_name_by_bms(
    dir: String,
    set_type: BmsFolderSetNameType,
    dry_run: bool,
    replace: ReplacePreset,
    skip_already_formatted: bool,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::work::set_name_by_bms(&path, set_type, dry_run, replace, skip_already_formatted)
        .await
        .map_err(|e| e.to_string())
}

/// Undo directory name setting
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn work_undo_set_name_by_bms(
    dir: String,
    set_type: BmsFolderSetNameType,
    dry_run: bool,
) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::work::undo_set_name_by_bms(&path, set_type, dry_run)
        .await
        .map_err(|e| e.to_string())
}

/// Remove zero-byte media files
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn work_remove_zero_sized_media_files(dir: String, dry_run: bool) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::work::remove_zero_sized_media_files(&path, dry_run)
        .await
        .map_err(|e| e.to_string())
}
