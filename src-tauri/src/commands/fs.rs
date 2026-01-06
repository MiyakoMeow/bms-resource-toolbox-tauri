use std::path::PathBuf;

/// Check if two files have the same content
///
/// # Errors
///
/// Returns an error if file reading fails
#[tauri::command]
pub async fn fs_is_file_same_content(file1: String, file2: String) -> Result<bool, String> {
    let path1 = PathBuf::from(file1);
    let path2 = PathBuf::from(file2);
    crate::fs::is_file_same_content(&path1, &path2)
        .await
        .map_err(|e| e.to_string())
}

/// Check if directory contains files
///
/// # Errors
///
/// Returns an error if directory access fails
#[tauri::command]
pub async fn fs_is_dir_having_file(dir: String) -> Result<bool, String> {
    let path = PathBuf::from(dir);
    crate::fs::is_dir_having_file(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Remove empty folders
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn fs_remove_empty_folders(dir: String, dry_run: bool) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::fs::remove_empty_folders(&path, dry_run)
        .await
        .map_err(|e| e.to_string())
}

/// Calculate BMS directory similarity
///
/// # Errors
///
/// Returns an error if directory access fails
#[tauri::command]
pub async fn fs_bms_dir_similarity(dir1: String, dir2: String) -> Result<f64, String> {
    let path1 = PathBuf::from(dir1);
    let path2 = PathBuf::from(dir2);
    crate::fs::bms_dir_similarity(&path1, &path2)
        .await
        .map_err(|e| e.to_string())
}
