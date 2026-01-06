use std::path::PathBuf;

use crate::fs::moving::ReplacePreset;

/// Extract numerically named pack files to BMS folders
///
/// # Errors
///
/// Returns an error if extraction fails
#[tauri::command]
pub async fn rawpack_unzip_numeric_to_bms_folder(
    pack_dir: String,
    cache_dir: String,
    root_dir: String,
    confirm: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let pack_path = PathBuf::from(pack_dir);
    let cache_path = PathBuf::from(cache_dir);
    let root_path = PathBuf::from(root_dir);
    crate::options::rawpack::unzip_numeric_to_bms_folder(
        &pack_path,
        &cache_path,
        &root_path,
        confirm,
        replace,
    )
    .await
    .map_err(|e| e.to_string())
}

/// Extract files with names to BMS folders
///
/// # Errors
///
/// Returns an error if extraction fails
#[tauri::command]
pub async fn rawpack_unzip_with_name_to_bms_folder(
    pack_dir: String,
    cache_dir: String,
    root_dir: String,
    confirm: bool,
    replace: ReplacePreset,
) -> Result<(), String> {
    let pack_path = PathBuf::from(pack_dir);
    let cache_path = PathBuf::from(cache_dir);
    let root_path = PathBuf::from(root_dir);
    crate::options::rawpack::unzip_with_name_to_bms_folder(
        &pack_path,
        &cache_path,
        &root_path,
        confirm,
        replace,
    )
    .await
    .map_err(|e| e.to_string())
}
