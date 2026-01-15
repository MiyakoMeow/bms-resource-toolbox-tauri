#![recursion_limit = "512"]

pub mod bms;
pub mod fs;
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
                // 保留的命令（如果有）
                // 所有业务逻辑已迁移到前端
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
