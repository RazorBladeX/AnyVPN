import { invoke } from "@tauri-apps/api/core";

export type ConnectionState = "connected" | "connecting" | "disconnecting" | "disconnected" | "error";
export type LogLevel = "info" | "warn" | "error";

export interface Profile {
  id: string;
  backend: string;
  name: string;
  notes?: string | null;
  country?: string | null;
  remoteHost?: string | null;
  remotePort?: number | null;
  protocol?: string | null;
  device?: string | null;
  configPath: string;
  importedAt: string;
  lastConnectedAt?: string | null;
  connectionCount: number;
}

export interface ProfileImportPreview {
  backend: string;
  name: string;
  country?: string | null;
  remoteHost?: string | null;
  remotePort?: number | null;
  protocol?: string | null;
  device?: string | null;
}

export interface RecentConnection {
  profileId: string;
  profileName: string;
  country?: string | null;
  connectedAt: string;
}

export interface ConnectionStatus {
  state: ConnectionState;
  activeProfileId?: string | null;
  activeProfileName?: string | null;
  publicIp?: string | null;
  location?: string | null;
  connectedAt?: string | null;
  bytesIn: number;
  bytesOut: number;
  downloadMbps: number;
  uploadMbps: number;
  lastError?: string | null;
}

export interface AppSettings {
  autoConnectOnStartup: boolean;
  launchAtLogin: boolean;
  startMinimized: boolean;
  killSwitch: boolean;
  autoReconnect: boolean;
  dnsLeakProtection: boolean;
  ipv6LeakProtection: boolean;
  loggingLevel: string;
  theme: string;
  openvpnBinaryPath?: string | null;
  mtu?: number | null;
  publicIpService: string;
  speedTestIntervalSeconds: number;
  customTitleBar: boolean;
  animations: boolean;
  preferredProfileId?: string | null;
}

export interface OpenVpnDiagnostics {
  detected: boolean;
  executable?: string | null;
  instructions: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface AppMetadata {
  name: string;
  version: string;
  identifier: string;
}

export const api = {
  appMetadata: () => invoke<AppMetadata>("app_metadata"),
  listProfiles: () => invoke<Profile[]>("list_profiles"),
  previewProfileImport: (sourcePath: string) => invoke<ProfileImportPreview>("preview_profile_import", { sourcePath }),
  recentConnections: () => invoke<RecentConnection[]>("recent_connections"),
  importProfile: (sourcePath: string) => invoke<Profile>("import_profile", { sourcePath }),
  updateProfile: (id: string, update: { name?: string; notes?: string | null }) =>
    invoke<Profile>("update_profile", { id, update }),
  updateProfileLocation: (id: string, country: string) => invoke<Profile>("update_profile_location", { id, country }),
  deleteProfile: (id: string) => invoke<void>("delete_profile", { id }),
  connectProfile: (profileId: string) => invoke<ConnectionStatus>("connect_profile", { profileId }),
  disconnectVpn: () => invoke<ConnectionStatus>("disconnect_vpn"),
  getStatus: () => invoke<ConnectionStatus>("get_status"),
  estimateSpeedSample: () => invoke<ConnectionStatus>("estimate_speed_sample"),
  getLogs: () => invoke<LogEntry[]>("get_logs"),
  clearLogs: () => invoke<void>("clear_logs"),
  exportLogs: (targetPath: string) => invoke<void>("export_logs", { targetPath }),
  getSettings: () => invoke<AppSettings>("get_settings"),
  saveSettings: (next: AppSettings) => invoke<AppSettings>("save_settings", { next }),
  exportSettings: (targetPath: string) => invoke<void>("export_settings", { targetPath }),
  importSettings: (sourcePath: string) => invoke<AppSettings>("import_settings", { sourcePath }),
  resetAppData: () => invoke<void>("reset_app_data"),
  openProfilesFolder: () => invoke<void>("open_profiles_folder"),
  openVpnDiagnostics: () => invoke<OpenVpnDiagnostics>("openvpn_diagnostics"),
  checkForUpdates: () => invoke<string>("check_for_updates")
};
