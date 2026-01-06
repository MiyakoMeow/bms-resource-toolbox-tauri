use crate::options::bms_event::BMSEvent;

/// Open BMS event list page
///
/// # Errors
///
/// Returns an error if opening the URL fails
#[tauri::command]
pub fn bms_event_open_list(event: BMSEvent) -> Result<(), String> {
    crate::options::bms_event::open_event_list(event).map_err(|e| e.to_string())
}

/// Open multiple BMS event work details pages
///
/// # Errors
///
/// Returns an error if opening the URLs fails
#[tauri::command]
pub fn bms_event_open_event_works(event: BMSEvent, work_ids: Vec<u32>) -> Result<(), String> {
    crate::options::bms_event::open_event_works(event, &work_ids).map_err(|e| e.to_string())
}
