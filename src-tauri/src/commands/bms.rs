use std::path::PathBuf;

use bms_rs::bms::prelude::{Bms, BmsOutput};

/// Parse BMS file
///
/// # Errors
///
/// Returns an error if file reading or parsing fails
#[tauri::command]
pub async fn bms_parse_bms_file(file: String) -> Result<BmsOutput, String> {
    let path = PathBuf::from(file);
    crate::bms::parse_bms_file(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Parse BMSON file
///
/// # Errors
///
/// Returns an error if file reading or parsing fails
#[tauri::command]
pub async fn bms_parse_bmson_file(file: String) -> Result<BmsOutput, String> {
    let path = PathBuf::from(file);
    crate::bms::parse_bmson_file(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Get BMS file list in directory
///
/// # Errors
///
/// Returns an error if directory reading or file parsing fails
#[tauri::command]
pub async fn bms_get_dir_bms_list(dir: String) -> Result<Vec<BmsOutput>, String> {
    let path = PathBuf::from(dir);
    crate::bms::get_dir_bms_list(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Get BMS information in directory
///
/// # Errors
///
/// Returns an error if directory reading or file parsing fails
#[tauri::command]
pub async fn bms_get_dir_bms_info(dir: String) -> Result<Option<Bms>, String> {
    let path = PathBuf::from(dir);
    crate::bms::get_dir_bms_info(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Check if it's a work directory
///
/// # Errors
///
/// Returns an error if directory access fails
#[tauri::command]
pub async fn bms_is_work_dir(dir: String) -> Result<bool, String> {
    let path = PathBuf::from(dir);
    crate::bms::is_work_dir(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Check if it's a root directory
///
/// # Errors
///
/// Returns an error if directory access fails
#[tauri::command]
pub async fn bms_is_root_dir(dir: String) -> Result<bool, String> {
    let path = PathBuf::from(dir);
    crate::bms::is_root_dir(&path)
        .await
        .map_err(|e| e.to_string())
}
