use std::fs;

use tauri::AppHandle;
use tauri_plugin_autostart::ManagerExt;

use crate::{models::AppSettings, profiles};

pub fn load_settings(app: &AppHandle) -> Result<AppSettings, String> {
    let path = profiles::settings_path(app)?;
    let raw = fs::read_to_string(path).unwrap_or_else(|_| "{}".to_string());
    serde_json::from_str(&raw).map_err(|error| format!("Settings file is invalid: {error}"))
}

pub fn save_settings(app: &AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    let path = profiles::settings_path(app)?;
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|error| format!("Unable to serialize settings: {error}"))?;
    fs::write(path, json).map_err(|error| format!("Unable to save settings: {error}"))?;

    let autostart = app.autolaunch();
    if settings.launch_at_login {
        autostart
            .enable()
            .map_err(|error| format!("Unable to enable launch at login: {error}"))?;
    } else {
        autostart
            .disable()
            .map_err(|error| format!("Unable to disable launch at login: {error}"))?;
    }

    Ok(settings)
}
