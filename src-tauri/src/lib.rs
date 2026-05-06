mod commands;
mod models;
mod openvpn;
mod profiles;
mod settings;
mod tray;
mod vpn;

use std::sync::Mutex;

use models::{AppSettings, ConnectionState};
use tauri::Manager;
use vpn::VpnController;

pub struct AppState {
    vpn: Mutex<VpnController>,
    settings: Mutex<AppSettings>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            profiles::ensure_app_dirs(app.handle())?;
            let settings = settings::load_settings(app.handle()).unwrap_or_default();

            app.manage(AppState {
                vpn: Mutex::new(VpnController::new(ConnectionState::Disconnected)),
                settings: Mutex::new(settings),
            });

            tray::install(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_metadata,
            commands::app_paths,
            commands::check_for_updates,
            commands::clear_logs,
            commands::connect_profile,
            commands::delete_profile,
            commands::disconnect_vpn,
            commands::estimate_speed_sample,
            commands::export_logs,
            commands::export_settings,
            commands::get_logs,
            commands::get_settings,
            commands::get_status,
            commands::import_settings,
            commands::import_profile,
            commands::list_profiles,
            commands::open_profiles_folder,
            commands::preview_profile_import,
            commands::save_settings,
            commands::recent_connections,
            commands::reset_app_data,
            commands::update_profile,
            commands::update_profile_location,
            commands::openvpn_diagnostics
        ])
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                if let Some(state) = window.app_handle().try_state::<AppState>() {
                    if let Ok(mut vpn) = state.vpn.lock() {
                        let _ = vpn.disconnect(window.app_handle());
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running AnyVPN");
}
