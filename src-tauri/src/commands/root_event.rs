use std::path::PathBuf;

/// Check numbered folders
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_event_check_num_folder(dir: String, max: usize) -> Result<Vec<PathBuf>, String> {
    let path = PathBuf::from(dir);
    crate::options::root_event::check_num_folder(&path, max)
        .await
        .map_err(|e| e.to_string())
}

/// Create numbered folders
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_event_create_num_folders(dir: String, count: usize) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_event::create_num_folders(&path, count)
        .await
        .map_err(|e| e.to_string())
}

/// Generate work information table
///
/// # Errors
///
/// Returns an error if directory operations fail
#[tauri::command]
pub async fn root_event_generate_work_info_table(dir: String) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::root_event::generate_work_info_table(&path)
        .await
        .map_err(|e| e.to_string())
}
