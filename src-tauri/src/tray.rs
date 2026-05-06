use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

use crate::AppState;

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    let connect = MenuItem::with_id(app, "quick-connect", "Quick Connect", true, None::<&str>)?;
    let disconnect = MenuItem::with_id(app, "disconnect", "Disconnect", true, None::<&str>)?;
    let show = MenuItem::with_id(app, "show", "Show AnyVPN", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&connect, &disconnect, &show, &quit])?;

    let mut builder = TrayIconBuilder::with_id("anyvpn-tray")
        .tooltip("AnyVPN")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "quick-connect" => {
                let _ = app.emit("tray-quick-connect", ());
                show_main_window(app);
            }
            "disconnect" => {
                if let Some(state) = app.try_state::<AppState>() {
                    if let Ok(mut vpn) = state.vpn.lock() {
                        let _ = vpn.disconnect(app);
                    }
                }
            }
            "quit" => {
                if let Some(state) = app.try_state::<AppState>() {
                    if let Ok(mut vpn) = state.vpn.lock() {
                        let _ = vpn.disconnect(app);
                    }
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;

    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
