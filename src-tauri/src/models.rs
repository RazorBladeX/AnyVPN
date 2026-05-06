use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    #[serde(default = "default_backend")]
    pub backend: String,
    pub name: String,
    pub notes: Option<String>,
    pub country: Option<String>,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub protocol: Option<String>,
    pub device: Option<String>,
    pub config_path: PathBuf,
    pub imported_at: DateTime<Utc>,
    pub last_connected_at: Option<DateTime<Utc>>,
    #[serde(default)]
    pub connection_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdate {
    pub name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileImportPreview {
    pub backend: String,
    pub name: String,
    pub country: Option<String>,
    pub remote_host: Option<String>,
    pub remote_port: Option<u16>,
    pub protocol: Option<String>,
    pub device: Option<String>,
}

fn default_backend() -> String {
    "openvpn".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentConnection {
    pub profile_id: String,
    pub profile_name: String,
    pub country: Option<String>,
    pub connected_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionState {
    Connected,
    Connecting,
    Disconnecting,
    Disconnected,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatus {
    pub state: ConnectionState,
    pub active_profile_id: Option<String>,
    pub active_profile_name: Option<String>,
    pub public_ip: Option<String>,
    pub location: Option<String>,
    pub connected_at: Option<DateTime<Utc>>,
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub download_mbps: f64,
    pub upload_mbps: f64,
    pub last_error: Option<String>,
}

impl Default for ConnectionStatus {
    fn default() -> Self {
        Self {
            state: ConnectionState::Disconnected,
            active_profile_id: None,
            active_profile_name: None,
            public_ip: None,
            location: None,
            connected_at: None,
            bytes_in: 0,
            bytes_out: 0,
            download_mbps: 0.0,
            upload_mbps: 0.0,
            last_error: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub auto_connect_on_startup: bool,
    pub launch_at_login: bool,
    pub start_minimized: bool,
    pub kill_switch: bool,
    pub auto_reconnect: bool,
    pub dns_leak_protection: bool,
    pub ipv6_leak_protection: bool,
    pub logging_level: String,
    pub theme: String,
    pub openvpn_binary_path: Option<PathBuf>,
    pub mtu: Option<u16>,
    pub public_ip_service: String,
    pub speed_test_interval_seconds: u16,
    pub custom_title_bar: bool,
    pub animations: bool,
    pub preferred_profile_id: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            auto_connect_on_startup: false,
            launch_at_login: false,
            start_minimized: false,
            kill_switch: false,
            auto_reconnect: true,
            dns_leak_protection: true,
            ipv6_leak_protection: true,
            logging_level: "info".to_string(),
            theme: "dark".to_string(),
            openvpn_binary_path: None,
            mtu: None,
            public_ip_service: "http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,query".to_string(),
            speed_test_interval_seconds: 5,
            custom_title_bar: true,
            animations: true,
            preferred_profile_id: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenVpnDiagnostics {
    pub detected: bool,
    pub executable: Option<PathBuf>,
    pub instructions: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub app_data_dir: PathBuf,
    pub profiles_dir: PathBuf,
    pub sidecars_dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppMetadata {
    pub name: String,
    pub version: String,
    pub identifier: String,
}
