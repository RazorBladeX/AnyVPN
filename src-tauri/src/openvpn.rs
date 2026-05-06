use std::{
    env,
    path::{Path, PathBuf},
};

use crate::models::OpenVpnDiagnostics;

pub fn detect_openvpn(app_data_dir: &Path) -> Option<PathBuf> {
    sidecar_candidates(app_data_dir)
        .into_iter()
        .find(|candidate| candidate.exists())
        .or_else(|| system_candidates().into_iter().find(|candidate| candidate.exists()))
}

pub fn resolve_openvpn(app_data_dir: &Path, configured_path: Option<PathBuf>) -> Option<PathBuf> {
    sidecar_candidates(app_data_dir)
        .into_iter()
        .find(|candidate| candidate.exists())
        .or_else(|| {
            configured_path
                .filter(|path| path.exists())
                .or_else(|| system_candidates().into_iter().find(|candidate| candidate.exists()))
        })
}

pub fn resolve_configured_or_system_openvpn(
    _app_data_dir: &Path,
    configured_path: Option<PathBuf>,
) -> Option<PathBuf> {
    configured_path
        .filter(|path| path.exists())
        .or_else(|| system_candidates().into_iter().find(|candidate| candidate.exists()))
}

pub fn diagnostics(app_data_dir: &Path) -> OpenVpnDiagnostics {
    let executable = detect_openvpn(app_data_dir);
    let detected = executable.is_some();
    OpenVpnDiagnostics {
        detected,
        executable,
        instructions: install_instructions(),
    }
}

fn sidecar_candidates(app_data_dir: &Path) -> Vec<PathBuf> {
    let exe = if cfg!(windows) { "openvpn.exe" } else { "openvpn" };
    let target_suffix = if cfg!(all(windows, target_arch = "x86_64")) {
        "openvpn-x86_64-pc-windows-msvc.exe"
    } else if cfg!(all(windows, target_arch = "aarch64")) {
        "openvpn-aarch64-pc-windows-msvc.exe"
    } else if cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        "openvpn-aarch64-apple-darwin"
    } else if cfg!(all(target_os = "macos", target_arch = "x86_64")) {
        "openvpn-x86_64-apple-darwin"
    } else if cfg!(all(target_os = "linux", target_arch = "aarch64")) {
        "openvpn-aarch64-unknown-linux-gnu"
    } else {
        "openvpn-x86_64-unknown-linux-gnu"
    };
    let mut candidates = vec![
        PathBuf::from("sidecars").join(target_suffix),
        PathBuf::from("src-tauri").join("sidecars").join(target_suffix),
        app_data_dir.join("sidecars").join(exe),
        PathBuf::from("sidecars").join(exe),
        PathBuf::from("src-tauri").join("sidecars").join(exe),
    ];

    if let Ok(current_exe) = env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            candidates.push(exe_dir.join(target_suffix));
            candidates.push(exe_dir.join("sidecars").join(target_suffix));
            candidates.push(exe_dir.join(exe));
            candidates.push(exe_dir.join("sidecars").join(exe));
        }
    }

    candidates
}

fn system_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(paths) = env::var_os("PATH") {
        for entry in env::split_paths(&paths) {
            candidates.push(entry.join(if cfg!(windows) { "openvpn.exe" } else { "openvpn" }));
        }
    }

    if cfg!(windows) {
        candidates.extend([
            PathBuf::from(r"C:\Program Files\OpenVPN\bin\openvpn.exe"),
        ]);
    } else if cfg!(target_os = "macos") {
        candidates.extend([
            PathBuf::from("/opt/homebrew/sbin/openvpn"),
            PathBuf::from("/usr/local/sbin/openvpn"),
            PathBuf::from("/usr/local/bin/openvpn"),
        ]);
    } else {
        candidates.extend([
            PathBuf::from("/usr/sbin/openvpn"),
            PathBuf::from("/usr/bin/openvpn"),
            PathBuf::from("/snap/bin/openvpn"),
        ]);
    }

    candidates
}

fn install_instructions() -> String {
    if cfg!(windows) {
        "OpenVPN sidecar was not found. Add the official OpenVPN Community openvpn.exe sidecar for this target, or configure the OpenVPN CLI binary path in Settings. OpenVPN Connect GUI is not supported because AnyVPN requires management-interface control.".to_string()
    } else if cfg!(target_os = "macos") {
        "OpenVPN sidecar was not found. Add the official OpenVPN CLI sidecar for this target, or configure a CLI binary from `brew install openvpn`. AnyVPN requires management-interface control.".to_string()
    } else {
        "OpenVPN sidecar was not found. Add the official OpenVPN CLI sidecar for this target, or configure a CLI binary from your package manager. Tunnel setup requires root/network capabilities.".to_string()
    }
}
