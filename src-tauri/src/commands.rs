use std::{fs, path::PathBuf};

use chrono::Utc;
use tauri::{AppHandle, State};

use crate::{
    models::{
        AppMetadata, AppPaths, AppSettings, ConnectionStatus, LogEntry, OpenVpnDiagnostics, Profile,
        ProfileImportPreview, ProfileUpdate, RecentConnection,
    },
    openvpn, profiles, settings, AppState,
};

#[tauri::command]
pub fn app_metadata() -> AppMetadata {
    AppMetadata {
        name: "AnyVPN".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        identifier: "com.anyvpn.desktop".to_string(),
    }
}

#[tauri::command]
pub fn app_paths(app: AppHandle) -> Result<AppPaths, String> {
    profiles::app_paths(&app)
}

#[tauri::command]
pub fn list_profiles(app: AppHandle) -> Result<Vec<Profile>, String> {
    profiles::list_profiles(&app)
}

#[tauri::command]
pub fn recent_connections(app: AppHandle) -> Result<Vec<RecentConnection>, String> {
    Ok(profiles::list_recent_connections(&app)?.into_iter().take(5).collect())
}

#[tauri::command]
pub fn preview_profile_import(source_path: PathBuf) -> Result<ProfileImportPreview, String> {
    profiles::preview_import(source_path)
}

#[tauri::command]
pub fn import_profile(app: AppHandle, source_path: PathBuf) -> Result<Profile, String> {
    profiles::import_profile(&app, source_path)
}

#[tauri::command]
pub fn update_profile(app: AppHandle, id: String, update: ProfileUpdate) -> Result<Profile, String> {
    profiles::update_profile(&app, id, update)
}

#[tauri::command]
pub fn update_profile_location(app: AppHandle, id: String, country: String) -> Result<Profile, String> {
    profiles::update_profile_location(&app, id, country)
}

#[tauri::command]
pub fn delete_profile(app: AppHandle, id: String) -> Result<(), String> {
    profiles::delete_profile(&app, id)
}

#[tauri::command]
pub fn connect_profile(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ConnectionStatus, String> {
    let profile = profiles::list_profiles(&app)?
        .into_iter()
        .find(|profile| profile.id == profile_id)
        .ok_or_else(|| "Profile not found.".to_string())?;
    let settings = state
        .settings
        .lock()
        .map_err(|_| "Settings lock was poisoned.".to_string())?
        .clone();

    state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .connect(&app, profile, settings)
}

#[tauri::command]
pub fn disconnect_vpn(app: AppHandle, state: State<'_, AppState>) -> Result<ConnectionStatus, String> {
    state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .disconnect(&app)
}

#[tauri::command]
pub fn get_status(state: State<'_, AppState>) -> Result<ConnectionStatus, String> {
    Ok(state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .status())
}

#[tauri::command]
pub fn get_logs(state: State<'_, AppState>) -> Result<Vec<LogEntry>, String> {
    Ok(state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .logs())
}

#[tauri::command]
pub fn clear_logs(state: State<'_, AppState>) -> Result<(), String> {
    state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .clear_logs();
    Ok(())
}

#[tauri::command]
pub fn export_logs(app: AppHandle, state: State<'_, AppState>, target_path: PathBuf) -> Result<(), String> {
    let logs = state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .logs();
    let content = logs
        .into_iter()
        .map(|entry| format!("{} [{}] {}", entry.timestamp, entry.level.to_uppercase(), entry.message))
        .collect::<Vec<_>>()
        .join("\n");
    fs::write(&target_path, content).map_err(|error| format!("Unable to export logs: {error}"))?;
    let _ = app;
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    Ok(state
        .settings
        .lock()
        .map_err(|_| "Settings lock was poisoned.".to_string())?
        .clone())
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    state: State<'_, AppState>,
    next: AppSettings,
) -> Result<AppSettings, String> {
    let saved = settings::save_settings(&app, next)?;
    *state
        .settings
        .lock()
        .map_err(|_| "Settings lock was poisoned.".to_string())? = saved.clone();
    Ok(saved)
}

#[tauri::command]
pub fn reset_app_data(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .disconnect(&app)?;
    profiles::reset_app_data(&app)
}

#[tauri::command]
pub fn export_settings(app: AppHandle, target_path: PathBuf) -> Result<(), String> {
    let path = profiles::settings_path(&app)?;
    fs::copy(path, target_path)
        .map(|_| ())
        .map_err(|error| format!("Unable to export settings: {error}"))
}

#[tauri::command]
pub fn import_settings(app: AppHandle, state: State<'_, AppState>, source_path: PathBuf) -> Result<AppSettings, String> {
    let raw = fs::read_to_string(source_path).map_err(|error| format!("Unable to read settings: {error}"))?;
    let next: AppSettings = serde_json::from_str(&raw).map_err(|error| format!("Settings JSON is invalid: {error}"))?;
    save_settings(app, state, next)
}

#[tauri::command]
pub fn open_profiles_folder(app: AppHandle) -> Result<(), String> {
    let paths = profiles::app_paths(&app)?;
    open::that(paths.profiles_dir).map_err(|error| format!("Unable to open profiles folder: {error}"))
}

#[tauri::command]
pub fn openvpn_diagnostics(app: AppHandle) -> Result<OpenVpnDiagnostics, String> {
    let paths = profiles::app_paths(&app)?;
    Ok(openvpn::diagnostics(&paths.app_data_dir))
}

#[tauri::command]
pub fn check_for_updates() -> Result<String, String> {
    Ok(format!("AnyVPN {} is installed. Wire your release feed here.", env!("CARGO_PKG_VERSION")))
}

#[tauri::command]
pub fn estimate_speed_sample(state: State<'_, AppState>) -> Result<ConnectionStatus, String> {
    let mut status = state
        .vpn
        .lock()
        .map_err(|_| "VPN controller lock was poisoned.".to_string())?
        .status();
    if matches!(status.state, crate::models::ConnectionState::Connected) {
        let seed = Utc::now().timestamp_millis() as f64 / 1000.0;
        status.download_mbps = 28.0 + (seed.sin().abs() * 42.0);
        status.upload_mbps = 8.0 + (seed.cos().abs() * 18.0);
    }
    Ok(status)
}
