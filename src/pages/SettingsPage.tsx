import { Download, ExternalLink, FolderOpen, RotateCcw, Upload, Wrench } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";
import type { AppMetadata, AppSettings, OpenVpnDiagnostics } from "../lib/tauri";

export function SettingsPage({
  settings,
  metadata,
  diagnostics,
  onChange,
  onOpenProfiles,
  onRefreshDiagnostics,
  onCheckUpdates,
  onReset,
  onExportSettings,
  onImportSettings
}: {
  settings: AppSettings;
  metadata?: AppMetadata | null;
  diagnostics?: OpenVpnDiagnostics | null;
  onChange: (settings: AppSettings) => void;
  onOpenProfiles: () => void;
  onRefreshDiagnostics: () => void;
  onCheckUpdates: () => void;
  onReset: () => void;
  onExportSettings: () => void;
  onImportSettings: () => void;
}) {
  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SettingsCard title="General">
        <Toggle label="Launch at login" checked={settings.launchAtLogin} onChange={(launchAtLogin) => update({ launchAtLogin })} />
        <Toggle label="Auto-connect on startup" checked={settings.autoConnectOnStartup} onChange={(autoConnectOnStartup) => update({ autoConnectOnStartup })} />
        <Toggle label="Start minimized" checked={settings.startMinimized} onChange={(startMinimized) => update({ startMinimized })} />
        <Select label="Theme" value={settings.theme} onChange={(theme) => update({ theme })} options={["dark", "light", "system"]} />
      </SettingsCard>

      <SettingsCard title="Connection">
        <Toggle label="Kill switch" checked={settings.killSwitch} onChange={(killSwitch) => update({ killSwitch })} />
        <Toggle label="Auto-reconnect" checked={settings.autoReconnect} onChange={(autoReconnect) => update({ autoReconnect })} />
        <Toggle label="DNS leak protection" checked={settings.dnsLeakProtection} onChange={(dnsLeakProtection) => update({ dnsLeakProtection })} />
        <Toggle label="IPv6 leak protection" checked={settings.ipv6LeakProtection} onChange={(ipv6LeakProtection) => update({ ipv6LeakProtection })} />
      </SettingsCard>

      <SettingsCard title="VPN Engine">
        <TextInput label="OpenVPN binary path" value={settings.openvpnBinaryPath || ""} onChange={(openvpnBinaryPath) => update({ openvpnBinaryPath: openvpnBinaryPath || null })} />
        <Select label="Logging verbosity" value={settings.loggingLevel} onChange={(loggingLevel) => update({ loggingLevel })} options={["silent", "warn", "info", "debug"]} />
        <TextInput label="MTU" value={settings.mtu?.toString() || ""} onChange={(value) => update({ mtu: value ? Number(value) : null })} />
        <div className="rounded-lg border border-border bg-white/[0.03] p-4 text-sm text-muted-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={diagnostics?.detected ? "font-medium text-primary" : "font-medium text-amber-300"}>
                {diagnostics?.detected ? "Backend ready" : "OpenVPN sidecar missing"}
              </p>
              <p className="mt-1 leading-5">
                {diagnostics?.detected ? `Detected OpenVPN: ${diagnostics.executable}` : diagnostics?.instructions}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <Button variant="outline" size="sm" onClick={onRefreshDiagnostics}>
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://openvpn.net/community-downloads/", "_blank")}
              >
                <Wrench className="h-4 w-4" aria-hidden />
                Fix
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-4 text-sm text-muted-foreground">
          WireGuard profile import is planned as the recommended modern backend. OpenVPN remains the production path until the WireGuard tunnel service is implemented.
        </div>
      </SettingsCard>

      <SettingsCard title="Privacy">
        <TextInput label="Public IP check service" value={settings.publicIpService} onChange={(publicIpService) => update({ publicIpService })} />
        <TextInput label="Speed sample interval seconds" value={settings.speedTestIntervalSeconds.toString()} onChange={(value) => update({ speedTestIntervalSeconds: Number(value) || 5 })} />
      </SettingsCard>

      <SettingsCard title="Appearance">
        <Toggle label="Custom title bar" checked={settings.customTitleBar} onChange={(customTitleBar) => update({ customTitleBar })} />
        <Toggle label="Animations" checked={settings.animations} onChange={(animations) => update({ animations })} />
      </SettingsCard>

      <SettingsCard title="About">
        <p className="text-sm text-muted-foreground">{metadata?.name || "AnyVPN"} version {metadata?.version || "0.1.0"}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onCheckUpdates}>Check for updates</Button>
          <Button variant="outline" onClick={() => window.open("https://github.com/", "_blank")}>
            <ExternalLink className="h-4 w-4" aria-hidden />
            GitHub
          </Button>
          <Button variant="outline" onClick={onOpenProfiles}>
            <FolderOpen className="h-4 w-4" aria-hidden />
            Profiles folder
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="Advanced">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onExportSettings}>
            <Download className="h-4 w-4" aria-hidden />
            Export settings
          </Button>
          <Button variant="outline" onClick={onImportSettings}>
            <Upload className="h-4 w-4" aria-hidden />
            Import settings
          </Button>
          <Button variant="destructive" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset app data
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-border bg-white/5 px-3 outline-none">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
