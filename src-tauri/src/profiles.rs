use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

use chrono::Utc;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

use crate::models::{AppPaths, Profile, ProfileImportPreview, ProfileUpdate, RecentConnection};

const PROFILE_INDEX: &str = "profiles.json";
const SETTINGS_FILE: &str = "settings.json";
const RECENTS_FILE: &str = "recent_connections.json";
const DANGEROUS_DIRECTIVES: &[&str] = &[
    "script-security",
    "up",
    "down",
    "route-up",
    "route-pre-down",
    "ipchange",
    "client-connect",
    "client-disconnect",
    "learn-address",
    "auth-user-pass-verify",
    "tls-verify",
];

pub fn app_paths(app: &AppHandle) -> Result<AppPaths, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to resolve app data directory: {error}"))?;

    Ok(AppPaths {
        profiles_dir: app_data_dir.join("profiles"),
        sidecars_dir: app_data_dir.join("sidecars"),
        app_data_dir,
    })
}

pub fn ensure_app_dirs(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let paths = app_paths(app).map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;
    fs::create_dir_all(&paths.profiles_dir)?;
    fs::create_dir_all(&paths.sidecars_dir)?;
    if !paths.app_data_dir.join(PROFILE_INDEX).exists() {
        fs::write(paths.app_data_dir.join(PROFILE_INDEX), "[]")?;
    }
    if !paths.app_data_dir.join(SETTINGS_FILE).exists() {
        fs::write(paths.app_data_dir.join(SETTINGS_FILE), "{}")?;
    }
    if !paths.app_data_dir.join(RECENTS_FILE).exists() {
        fs::write(paths.app_data_dir.join(RECENTS_FILE), "[]")?;
    }
    Ok(())
}

pub fn list_profiles(app: &AppHandle) -> Result<Vec<Profile>, String> {
    let paths = app_paths(app)?;
    let raw = fs::read_to_string(paths.app_data_dir.join(PROFILE_INDEX))
        .map_err(|error| format!("Unable to read profile index: {error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("Profile index is invalid: {error}"))
}

pub fn save_profiles(app: &AppHandle, profiles: &[Profile]) -> Result<(), String> {
    let paths = app_paths(app)?;
    let json = serde_json::to_string_pretty(profiles)
        .map_err(|error| format!("Unable to serialize profiles: {error}"))?;
    fs::write(paths.app_data_dir.join(PROFILE_INDEX), json)
        .map_err(|error| format!("Unable to save profile index: {error}"))
}

pub fn import_profile(app: &AppHandle, source_path: PathBuf) -> Result<Profile, String> {
    let raw = read_validated_ovpn(&source_path)?;
    let backend = backend_for_path(&source_path);
    let mut profiles = list_profiles(app)?;
    let parsed = if backend == "wireguard" {
        parse_wireguard(&raw, &source_path)
    } else {
        parse_ovpn(&raw, &source_path)
    };
    let id = Uuid::new_v4().to_string();
    let paths = app_paths(app)?;
    let profile_dir = paths.profiles_dir.join(&id);
    fs::create_dir_all(&profile_dir).map_err(|error| format!("Unable to create profile folder: {error}"))?;

    let config_path = profile_dir.join("config.ovpn");
    fs::write(&config_path, raw).map_err(|error| format!("Unable to copy profile: {error}"))?;
    copy_referenced_assets(&source_path, &profile_dir)?;

    let profile = Profile {
        id,
        backend,
        name: parsed.name,
        notes: None,
        country: parsed.country,
        remote_host: parsed.remote_host,
        remote_port: parsed.remote_port,
        protocol: parsed.protocol,
        device: parsed.device,
        config_path,
        imported_at: Utc::now(),
        last_connected_at: None,
        connection_count: 0,
    };

    profiles.push(profile.clone());
    save_profiles(app, &profiles)?;
    Ok(profile)
}

pub fn preview_import(source_path: PathBuf) -> Result<ProfileImportPreview, String> {
    let raw = read_validated_ovpn(&source_path)?;
    let backend = backend_for_path(&source_path);
    let parsed = if backend == "wireguard" {
        parse_wireguard(&raw, &source_path)
    } else {
        parse_ovpn(&raw, &source_path)
    };
    Ok(ProfileImportPreview {
        backend,
        name: parsed.name,
        country: parsed.country,
        remote_host: parsed.remote_host,
        remote_port: parsed.remote_port,
        protocol: parsed.protocol,
        device: parsed.device,
    })
}

fn read_validated_ovpn(source_path: &Path) -> Result<String, String> {
    let extension = source_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "ovpn" && extension != "conf" {
        return Err("Only .ovpn OpenVPN profiles and .conf WireGuard profiles can be imported.".to_string());
    }

    let raw = fs::read_to_string(&source_path)
        .map_err(|error| format!("Unable to read VPN profile: {error}"))?;
    if extension == "conf" {
        validate_wireguard(&raw)?;
    } else {
        validate_ovpn(&raw)?;
    }
    Ok(raw)
}

fn backend_for_path(source_path: &Path) -> String {
    if source_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .eq_ignore_ascii_case("conf")
    {
        "wireguard".to_string()
    } else {
        "openvpn".to_string()
    }
}

pub fn update_profile(app: &AppHandle, id: String, update: ProfileUpdate) -> Result<Profile, String> {
    let mut profiles = list_profiles(app)?;
    let profile = profiles
        .iter_mut()
        .find(|profile| profile.id == id)
        .ok_or_else(|| "Profile not found.".to_string())?;

    if let Some(name) = update.name {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("Profile name cannot be empty.".to_string());
        }
        profile.name = trimmed.to_string();
    }
    if update.notes.is_some() {
        profile.notes = update.notes;
    }

    let updated = profile.clone();
    save_profiles(app, &profiles)?;
    Ok(updated)
}

pub fn update_profile_location(app: &AppHandle, id: String, country: String) -> Result<Profile, String> {
    let mut profiles = list_profiles(app)?;
    let profile = profiles
        .iter_mut()
        .find(|profile| profile.id == id)
        .ok_or_else(|| "Profile not found.".to_string())?;
    profile.country = Some(country.trim().to_string());
    let updated = profile.clone();
    save_profiles(app, &profiles)?;
    Ok(updated)
}

pub fn delete_profile(app: &AppHandle, id: String) -> Result<(), String> {
    let mut profiles = list_profiles(app)?;
    let profile = profiles
        .iter()
        .find(|profile| profile.id == id)
        .cloned()
        .ok_or_else(|| "Profile not found.".to_string())?;

    profiles.retain(|profile| profile.id != id);
    save_profiles(app, &profiles)?;

    if let Some(parent) = profile.config_path.parent() {
        if parent.file_name().and_then(|value| value.to_str()) == Some(profile.id.as_str()) {
            fs::remove_dir_all(parent).map_err(|error| format!("Unable to delete profile files: {error}"))?;
        }
    }
    Ok(())
}

pub fn mark_connected(app: &AppHandle, id: &str) -> Result<(), String> {
    let mut profiles = list_profiles(app)?;
    let mut recent = None;
    if let Some(profile) = profiles.iter_mut().find(|profile| profile.id == id) {
        let now = Utc::now();
        profile.last_connected_at = Some(now);
        profile.connection_count = profile.connection_count.saturating_add(1);
        recent = Some(RecentConnection {
            profile_id: profile.id.clone(),
            profile_name: profile.name.clone(),
            country: profile.country.clone(),
            connected_at: now,
        });
    }
    save_profiles(app, &profiles)?;
    if let Some(recent) = recent {
        push_recent(app, recent)?;
    }
    Ok(())
}

pub fn list_recent_connections(app: &AppHandle) -> Result<Vec<RecentConnection>, String> {
    let paths = app_paths(app)?;
    let raw = fs::read_to_string(paths.app_data_dir.join(RECENTS_FILE)).unwrap_or_else(|_| "[]".to_string());
    serde_json::from_str(&raw).map_err(|error| format!("Recent connections file is invalid: {error}"))
}

fn push_recent(app: &AppHandle, recent: RecentConnection) -> Result<(), String> {
    let paths = app_paths(app)?;
    let mut recents = list_recent_connections(app)?;
    recents.retain(|item| item.profile_id != recent.profile_id);
    recents.insert(0, recent);
    recents.truncate(20);
    let json = serde_json::to_string_pretty(&recents)
        .map_err(|error| format!("Unable to serialize recent connections: {error}"))?;
    fs::write(paths.app_data_dir.join(RECENTS_FILE), json)
        .map_err(|error| format!("Unable to save recent connections: {error}"))
}

pub fn reset_app_data(app: &AppHandle) -> Result<(), String> {
    let paths = app_paths(app)?;
    if paths.app_data_dir.exists() {
        fs::remove_dir_all(&paths.app_data_dir).map_err(|error| format!("Unable to reset app data: {error}"))?;
    }
    ensure_app_dirs(app).map_err(|error| error.to_string())
}

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_paths(app)?.app_data_dir.join(SETTINGS_FILE))
}

fn validate_ovpn(raw: &str) -> Result<(), String> {
    if raw.len() > 1024 * 1024 {
        return Err("Profile is too large. Keep imported .ovpn files under 1 MB.".to_string());
    }
    if !raw.lines().any(|line| directive_name(line) == Some("client")) {
        return Err("This does not look like a client OpenVPN profile.".to_string());
    }
    if !raw.lines().any(|line| directive_name(line) == Some("remote")) {
        return Err("OpenVPN profile is missing a remote server directive.".to_string());
    }

    for line in raw.lines() {
        let Some(name) = directive_name(line) else { continue };
        if DANGEROUS_DIRECTIVES.contains(&name) {
            return Err(format!("Directive `{name}` is not allowed in imported profiles."));
        }
        if name == "auth-user-pass" && line.split_whitespace().count() > 1 {
            return Err("Profiles that reference plaintext credential files are blocked. Remove the credential path and enter credentials through OpenVPN when prompted.".to_string());
        }
    }

    if raw.contains("<auth-user-pass>") {
        return Err("Inline plaintext credentials are not allowed in imported profiles.".to_string());
    }
    let lower = raw.to_ascii_lowercase();
    for pattern in ["powershell", "cmd.exe", "/bin/sh", "curl ", "wget ", "rm -rf", "format c:"] {
        if lower.contains(pattern) {
            return Err(format!("Profile contains suspicious command pattern `{pattern}`."));
        }
    }

    Ok(())
}

fn validate_wireguard(raw: &str) -> Result<(), String> {
    if raw.len() > 256 * 1024 {
        return Err("WireGuard profile is too large. Keep imported .conf files under 256 KB.".to_string());
    }
    if !raw.contains("[Interface]") || !raw.contains("[Peer]") {
        return Err("This does not look like a WireGuard profile.".to_string());
    }
    if !raw.lines().any(|line| line.trim_start().starts_with("Endpoint")) {
        return Err("WireGuard profile is missing a Peer Endpoint.".to_string());
    }
    let lower = raw.to_ascii_lowercase();
    for pattern in ["powershell", "cmd.exe", "/bin/sh", "postup", "postdown", "preup", "predown"] {
        if lower.contains(pattern) {
            return Err(format!("WireGuard profile contains unsupported command hook `{pattern}`."));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{infer_country, validate_ovpn};

    #[test]
    fn validates_minimal_client_profile() {
        let raw = "client\nremote vpn.example.com 1194\nproto udp\ndev tun\n";
        assert!(validate_ovpn(raw).is_ok());
    }

    #[test]
    fn rejects_script_hooks() {
        let raw = "client\nremote vpn.example.com 1194\nup /bin/sh\n";
        assert!(validate_ovpn(raw).is_err());
    }

    #[test]
    fn infers_country_from_hostname() {
        assert_eq!(infer_country("de-frankfurt.example.com").as_deref(), Some("Germany"));
    }
}

struct ParsedProfile {
    name: String,
    country: Option<String>,
    remote_host: Option<String>,
    remote_port: Option<u16>,
    protocol: Option<String>,
    device: Option<String>,
}

fn parse_ovpn(raw: &str, source_path: &Path) -> ParsedProfile {
    let mut remote_host = None;
    let mut remote_port = None;
    let mut protocol = None;
    let mut device = None;

    for line in raw.lines() {
        let cleaned = strip_comment(line);
        let parts: Vec<&str> = cleaned.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }
        match parts[0] {
            "remote" if parts.len() >= 2 => {
                remote_host = Some(parts[1].to_string());
                remote_port = parts.get(2).and_then(|value| value.parse::<u16>().ok());
            }
            "proto" if parts.len() >= 2 => protocol = Some(parts[1].to_ascii_uppercase()),
            "dev" if parts.len() >= 2 => device = Some(parts[1].to_string()),
            _ => {}
        }
    }

    let fallback_name = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Imported profile")
        .replace(['_', '-'], " ");

    let country = remote_host
        .as_deref()
        .and_then(infer_country)
        .or_else(|| infer_country(&fallback_name));

    ParsedProfile {
        name: title_case(&fallback_name),
        country,
        remote_host,
        remote_port,
        protocol,
        device,
    }
}

fn parse_wireguard(raw: &str, source_path: &Path) -> ParsedProfile {
    let mut remote_host = None;
    let mut remote_port = None;

    for line in raw.lines() {
        let cleaned = strip_comment(line);
        let Some((key, value)) = cleaned.split_once('=') else { continue };
        if key.trim().eq_ignore_ascii_case("Endpoint") {
            let endpoint = value.trim();
            if let Some((host, port)) = endpoint.rsplit_once(':') {
                remote_host = Some(host.trim_matches(['[', ']']).to_string());
                remote_port = port.parse::<u16>().ok();
            } else {
                remote_host = Some(endpoint.trim_matches(['[', ']']).to_string());
            }
        }
    }

    let fallback_name = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("WireGuard profile")
        .replace(['_', '-'], " ");
    let country = remote_host
        .as_deref()
        .and_then(infer_country)
        .or_else(|| infer_country(&fallback_name));

    ParsedProfile {
        name: title_case(&fallback_name),
        country,
        remote_host,
        remote_port,
        protocol: Some("WireGuard".to_string()),
        device: Some("wg".to_string()),
    }
}

fn copy_referenced_assets(source_path: &Path, target_dir: &Path) -> Result<(), String> {
    let raw = fs::read_to_string(source_path).map_err(|error| error.to_string())?;
    let source_dir = source_path.parent().unwrap_or_else(|| Path::new("."));
    let directives: HashSet<&str> = ["ca", "cert", "key", "tls-auth", "tls-crypt", "pkcs12"].into_iter().collect();

    for line in raw.lines() {
        let cleaned = strip_comment(line);
        let mut parts = cleaned.split_whitespace();
        let Some(name) = parts.next() else { continue };
        if !directives.contains(name) {
            continue;
        }
        let Some(relative) = parts.next() else { continue };
        if relative.starts_with('<') || Path::new(relative).is_absolute() {
            continue;
        }
        let source = source_dir.join(relative);
        if source.exists() {
            let target = target_dir.join(
                Path::new(relative)
                    .file_name()
                    .ok_or_else(|| format!("Invalid asset path in profile: {relative}"))?,
            );
            fs::copy(&source, target).map_err(|error| format!("Unable to copy {relative}: {error}"))?;
        }
    }

    Ok(())
}

fn directive_name(line: &str) -> Option<&str> {
    let cleaned = strip_comment(line);
    cleaned.split_whitespace().next()
}

fn strip_comment(line: &str) -> &str {
    line.split_once('#').map(|(left, _)| left).unwrap_or(line).trim()
}

fn title_case(value: &str) -> String {
    value
        .split_whitespace()
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => format!("{}{}", first.to_uppercase(), chars.as_str()),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn infer_country(value: &str) -> Option<String> {
    let lower = value.to_ascii_lowercase();
    let countries: [(&str, &[&str]); 9] = [
        ("united states", &["us", "usa", "new-york", "ny", "la", "chicago"]),
        ("united kingdom", &["uk", "gb", "london", "manchester"]),
        ("canada", &["ca", "toronto", "vancouver", "montreal"]),
        ("germany", &["de", "germany", "frankfurt", "berlin"]),
        ("france", &["fr", "france", "paris"]),
        ("netherlands", &["nl", "netherlands", "amsterdam"]),
        ("japan", &["jp", "japan", "tokyo", "osaka"]),
        ("singapore", &["sg", "singapore"]),
        ("australia", &["au", "australia", "sydney", "melbourne"]),
    ];

    countries.iter().find_map(|(country, tokens)| {
        tokens
            .iter()
            .any(|token| lower.contains(*token))
            .then(|| title_case(country))
    })
}
