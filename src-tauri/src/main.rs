// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    bms_resource_toolbox_lib::run().expect("Failed to run Tauri application");
}
