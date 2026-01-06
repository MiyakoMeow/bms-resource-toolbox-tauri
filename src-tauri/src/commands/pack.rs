use std::path::PathBuf;

/// Raw pack -> HQ pack
///
/// # Errors
///
/// Returns an error if pack processing fails
#[tauri::command]
pub async fn pack_raw_to_hq(dir: String) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::pack::pack_raw_to_hq(&path)
        .await
        .map_err(|e| e.to_string())
}

/// HQ pack -> LQ pack
///
/// # Errors
///
/// Returns an error if pack processing fails
#[tauri::command]
pub async fn pack_hq_to_lq(dir: String) -> Result<(), String> {
    let path = PathBuf::from(dir);
    crate::options::pack::pack_hq_to_lq(&path)
        .await
        .map_err(|e| e.to_string())
}

/// Pack generation script: Raw pack -> HQ pack
///
/// # Errors
///
/// Returns an error if pack processing fails
#[tauri::command]
pub async fn pack_setup_rawpack_to_hq(pack_dir: String, root_dir: String) -> Result<(), String> {
    let pack_path = PathBuf::from(pack_dir);
    let root_path = PathBuf::from(root_dir);
    crate::options::pack::pack_setup_rawpack_to_hq(&pack_path, &root_path)
        .await
        .map_err(|e| e.to_string())
}

/// Pack update script: Raw pack -> HQ pack
///
/// # Errors
///
/// Returns an error if pack processing fails
#[tauri::command]
pub async fn pack_update_rawpack_to_hq(
    pack_dir: String,
    root_dir: String,
    sync_dir: String,
) -> Result<(), String> {
    let pack_path = PathBuf::from(pack_dir);
    let root_path = PathBuf::from(root_dir);
    let sync_path = PathBuf::from(sync_dir);
    crate::options::pack::pack_update_rawpack_to_hq(&pack_path, &root_path, &sync_path)
        .await
        .map_err(|e| e.to_string())
}
