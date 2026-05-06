import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppSidebar, type Page } from "./components/AppSidebar";
import { CustomTitleBar } from "./components/CustomTitleBar";
import { ToastStack, type Toast } from "./components/ToastStack";
import { HomePage } from "./pages/HomePage";
import { LogsPage } from "./pages/LogsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { lookupPublicIp } from "./lib/ipLookup";
import {
  api,
  type AppMetadata,
  type AppSettings,
  type ConnectionStatus,
  type LogEntry,
  type OpenVpnDiagnostics,
  type Profile,
  type RecentConnection
} from "./lib/tauri";

const emptyStatus: ConnectionStatus = {
  state: "disconnected",
  bytesIn: 0,
  bytesOut: 0,
  downloadMbps: 0,
  uploadMbps: 0
};

const defaultSettings: AppSettings = {
  autoConnectOnStartup: false,
  launchAtLogin: false,
  startMinimized: false,
  killSwitch: false,
  autoReconnect: true,
  dnsLeakProtection: true,
  ipv6LeakProtection: true,
  loggingLevel: "info",
  theme: "dark",
  openvpnBinaryPath: null,
  mtu: null,
  publicIpService: "http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,query",
  speedTestIntervalSeconds: 5,
  customTitleBar: true,
  animations: true,
  preferredProfileId: null
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [metadata, setMetadata] = useState<AppMetadata | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [recents, setRecents] = useState<RecentConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>(emptyStatus);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [diagnostics, setDiagnostics] = useState<OpenVpnDiagnostics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [downloadHistory, setDownloadHistory] = useState<number[]>(Array(18).fill(0));
  const [uploadHistory, setUploadHistory] = useState<number[]>(Array(18).fill(0));

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) || profiles[0] || null,
    [profiles, selectedId]
  );

  const notify = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 5200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [nextMetadata, nextProfiles, nextRecents, nextStatus, nextSettings, nextLogs, nextDiagnostics] =
        await Promise.all([
          api.appMetadata(),
          api.listProfiles(),
          api.recentConnections(),
          api.getStatus(),
          api.getSettings(),
          api.getLogs(),
          api.openVpnDiagnostics()
        ]);
      setMetadata(nextMetadata);
      setProfiles(nextProfiles);
      setRecents(nextRecents);
      setStatus(nextStatus);
      setSettings(nextSettings);
      setLogs(nextLogs);
      setDiagnostics(nextDiagnostics);
      setSelectedId((current) => current || nextSettings.preferredProfileId || nextProfiles[0]?.id || null);
    } catch (error) {
      notify("error", String(error));
    }
  }, [notify]);

  const refreshPublicIp = useCallback(async (silent = false) => {
    try {
      const result = await lookupPublicIp(settings.publicIpService);
      setStatus((current) => ({
        ...current,
        publicIp: result.ip || current.publicIp,
        location: result.country || result.city || current.location
      }));
    } catch (error) {
      if (!silent) {
        notify("error", `Unable to refresh public IP: ${String(error)}`);
      }
    }
  }, [notify, settings.publicIpService]);

  const connect = useCallback(
    async (profileId?: string | null) => {
      if (!profileId) {
        notify("error", "Import or select a profile before connecting.");
        return;
      }
      const nextStatus = await api.connectProfile(profileId);
      setStatus(nextStatus);
      setRecents(await api.recentConnections());
      await refreshPublicIp(true);
      notify("success", "Connection started.");
    },
    [notify, refreshPublicIp]
  );

  useEffect(() => {
    refresh();
    const statusUnlisten = listen<ConnectionStatus>("vpn-status", (event) => setStatus(event.payload));
    const logUnlisten = listen<LogEntry>("vpn-log", (event) => {
      setLogs((current) => [...current.slice(-599), event.payload]);
    });
    const trayUnlisten = listen("tray-quick-connect", () => {
      connect(selectedProfile?.id).catch((error) => notify("error", String(error)));
    });

    return () => {
      statusUnlisten.then((unlisten) => unlisten());
      logUnlisten.then((unlisten) => unlisten());
      trayUnlisten.then((unlisten) => unlisten());
    };
  }, [connect, notify, refresh, selectedProfile?.id]);

  useEffect(() => {
    if (status.state !== "disconnected") return;
    refreshPublicIp(true);
    const interval = window.setInterval(() => refreshPublicIp(true), 30000);
    return () => window.clearInterval(interval);
  }, [refreshPublicIp, status.state]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (status.state !== "connected") return;
      try {
        const sample = await api.estimateSpeedSample();
        setStatus((current) => ({ ...current, downloadMbps: sample.downloadMbps, uploadMbps: sample.uploadMbps }));
        setDownloadHistory((current) => [...current.slice(-17), sample.downloadMbps]);
        setUploadHistory((current) => [...current.slice(-17), sample.uploadMbps]);
      } catch {
        // Speed sampling should never interrupt connection control.
      }
    }, Math.max(2, settings.speedTestIntervalSeconds) * 1000);
    return () => window.clearInterval(interval);
  }, [settings.speedTestIntervalSeconds, status.state]);

  async function handleProfileImported(profile: Profile) {
    const next = await api.listProfiles();
    setProfiles(next);
    setSelectedId(profile.id);
  }

  async function toggleConnection() {
    if (status.state === "connected" || status.state === "connecting") {
      setStatus(await api.disconnectVpn());
      notify("info", "Disconnected.");
    } else {
      await connect(selectedProfile?.id);
    }
  }

  async function saveSettings(next: AppSettings) {
    setSettings(next);
    setSettings(await api.saveSettings(next));
    notify("success", "Settings saved.");
  }

  async function renameProfile(profile: Profile) {
    const name = window.prompt("Profile name", profile.name);
    if (!name || name.trim() === profile.name) return;
    const updated = await api.updateProfile(profile.id, { name: name.trim() });
    setProfiles((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    notify("success", "Profile updated.");
  }

  async function deleteProfile(profile: Profile) {
    if (!window.confirm(`Delete ${profile.name}?`)) return;
    await api.deleteProfile(profile.id);
    const next = await api.listProfiles();
    setProfiles(next);
    setSelectedId((current) => (current === profile.id ? next[0]?.id || null : current));
    notify("info", "Profile deleted.");
  }

  async function exportLogs() {
    const targetPath = await save({ defaultPath: "anyvpn-openvpn.log" });
    if (targetPath) {
      await api.exportLogs(targetPath);
      notify("success", "Logs exported.");
    }
  }

  async function exportSettings() {
    const targetPath = await save({ defaultPath: "anyvpn-settings.json" });
    if (targetPath) {
      await api.exportSettings(targetPath);
      notify("success", "Settings exported.");
    }
  }

  async function importSettings() {
    const selected = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
    if (typeof selected === "string") {
      setSettings(await api.importSettings(selected));
      notify("success", "Settings imported.");
    }
  }

  const content =
    page === "home" ? (
      <HomePage
        status={status}
        profile={selectedProfile}
        recents={recents}
        downloadHistory={downloadHistory}
        uploadHistory={uploadHistory}
        killSwitchEnabled={settings.killSwitch}
        onRefreshIp={() => refreshPublicIp(false)}
        onReconnect={(profileId) => connect(profileId).catch((error) => notify("error", String(error)))}
        onToggle={() => toggleConnection().catch((error) => notify("error", String(error)))}
      />
    ) : page === "profiles" ? (
      <ProfilesPage
        profiles={profiles}
        selectedId={selectedId}
        onImported={(profile) => handleProfileImported(profile).catch((error) => notify("error", String(error)))}
        onSelect={setSelectedId}
        onConnect={(profileId) => connect(profileId).catch((error) => notify("error", String(error)))}
        onRename={(profile) => renameProfile(profile).catch((error) => notify("error", String(error)))}
        onDelete={(profile) => deleteProfile(profile).catch((error) => notify("error", String(error)))}
        onToast={notify}
      />
    ) : page === "logs" ? (
      <LogsPage
        logs={logs}
        onClear={() => api.clearLogs().then(() => setLogs([])).catch((error) => notify("error", String(error)))}
        onExport={() => exportLogs().catch((error) => notify("error", String(error)))}
      />
    ) : (
      <SettingsPage
        settings={settings}
        metadata={metadata}
        diagnostics={diagnostics}
        onChange={(next) => saveSettings(next).catch((error) => notify("error", String(error)))}
        onOpenProfiles={() => api.openProfilesFolder().catch((error) => notify("error", String(error)))}
        onRefreshDiagnostics={() => api.openVpnDiagnostics().then(setDiagnostics).catch((error) => notify("error", String(error)))}
        onCheckUpdates={() => api.checkForUpdates().then((message) => notify("info", message)).catch((error) => notify("error", String(error)))}
        onReset={() => {
          if (window.confirm("Reset all AnyVPN app data?")) {
            api.resetAppData().then(refresh).then(() => notify("info", "App data reset.")).catch((error) => notify("error", String(error)));
          }
        }}
        onExportSettings={() => exportSettings().catch((error) => notify("error", String(error)))}
        onImportSettings={() => importSettings().catch((error) => notify("error", String(error)))}
      />
    );

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      {settings.customTitleBar && <CustomTitleBar metadata={metadata} />}
      <div className={settings.customTitleBar ? "flex h-[calc(100vh-3rem)]" : "flex h-screen"}>
        <AppSidebar page={page} onPageChange={setPage} />
        <section className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-7">{content}</div>
        </section>
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </main>
  );
}
