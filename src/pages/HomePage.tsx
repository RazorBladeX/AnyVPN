import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Copy,
  Database,
  Gauge,
  MapPin,
  PlugZap,
  RadioTower,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { CompactConnectButton } from "../components/home/CompactConnectButton";
import { ConnectionInfoPanel } from "../components/home/ConnectionInfoPanel";
import { RecentConnections } from "../components/home/RecentConnections";
import { SmartStatCard } from "../components/home/SmartStatCard";
import { SpeedSparkline } from "../components/SpeedSparkline";
import { Button } from "../components/ui/button";
import { flagForCountry } from "../lib/flags";
import type { ConnectionStatus, Profile, RecentConnection } from "../lib/tauri";
import { formatBytes, formatDuration } from "../lib/utils";

interface HomePageProps {
  status: ConnectionStatus;
  profile: Profile | null;
  recents: RecentConnection[];
  downloadHistory: number[];
  uploadHistory: number[];
  killSwitchEnabled: boolean;
  onRefreshIp: () => void;
  onReconnect: (profileId: string) => void;
  onToggle: () => void;
}

export function HomePage({
  status,
  profile,
  recents,
  downloadHistory,
  uploadHistory,
  killSwitchEnabled,
  onRefreshIp,
  onReconnect,
  onToggle
}: HomePageProps) {
  const connected = status.state === "connected";
  const busy = status.state === "connecting" || status.state === "disconnecting";
  const location = status.location || profile?.country || "Unknown";
  const visibleIp = status.publicIp || "Checking...";
  const quickConnectProfileId = recents[0]?.profileId || profile?.id;
  const StatusIcon = connected ? ShieldCheck : ShieldAlert;

  async function copyIp() {
    if (status.publicIp) {
      await navigator.clipboard.writeText(status.publicIp);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden px-2 pb-10">
      <div className="pointer-events-none absolute left-1/2 top-10 h-72 w-[620px] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-12 right-2 h-64 w-64 rounded-full bg-blue-500/8 blur-[110px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          className="rounded-[2rem] border border-white/[0.07] bg-white/[0.028] p-5 shadow-[0_26px_120px_rgba(0,0,0,0.22)] backdrop-blur-md md:p-7"
        >
          <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/12 bg-cyan-300/[0.06] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">
                <Rocket className="h-4 w-4 text-cyan-200" aria-hidden />
                AnyVPN
              </div>

              <div>
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                    connected ? "bg-emerald-300/10 text-emerald-300" : busy ? "bg-cyan-300/10 text-cyan-200" : "bg-amber-300/10 text-amber-300"
                  }`}
                >
                  <StatusIcon className="h-4 w-4" aria-hidden />
                  {connected ? `Connected / ${location}` : busy ? "Connecting / Securing route" : "Disconnected / Exposed"}
                </div>
                <h1 className="mt-4 max-w-md text-3xl font-semibold tracking-[-0.035em] text-white md:text-4xl">
                  {connected ? "Secure tunnel active." : "One tap to go quiet."}
                </h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/46">
                  {connected
                    ? "Management telemetry is live: bytes, state, logs, and graceful disconnect are under AnyVPN control."
                    : "Your public route is visible. Use Quick Connect to restore your last trusted profile."}
                </p>
              </div>
            </div>

            <div className="justify-self-center">
              <CompactConnectButton status={status} disabled={!profile && !quickConnectProfileId} onToggle={onToggle} />
            </div>

            <div className="space-y-4 lg:justify-self-end">
              <div className="rounded-2xl border border-white/[0.07] bg-black/24 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/34">
                    {connected ? "VPN IP" : "Public IP"}
                  </span>
                  <Button variant="ghost" size="icon" onClick={copyIp} aria-label="Copy IP address">
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <p className="mt-2 truncate font-mono text-3xl font-semibold tracking-[-0.04em] text-white">{visibleIp}</p>
                <div className="mt-3 flex items-center gap-3 text-white/68">
                  <span className="text-3xl">{flagForCountry(location)}</span>
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 shrink-0 text-cyan-200/70" aria-hidden />
                    <span className="truncate">{location}</span>
                  </span>
                </div>
              </div>

              {!connected && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={onToggle} disabled={!quickConnectProfileId}>
                    <PlugZap className="h-4 w-4" aria-hidden />
                    Quick Connect
                  </Button>
                  <Button type="button" variant="ghost" onClick={onRefreshIp}>
                    Refresh IP
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmartStatCard icon={ArrowDownRight} label="Download" value={`${status.downloadMbps.toFixed(1)} Mbps`} hint="live" tone="cyan">
            <SpeedSparkline values={downloadHistory} color="primary" />
          </SmartStatCard>
          <SmartStatCard icon={ArrowUpRight} label="Upload" value={`${status.uploadMbps.toFixed(1)} Mbps`} hint="live" tone="cyan">
            <SpeedSparkline values={uploadHistory} color="accent" />
          </SmartStatCard>
          <SmartStatCard icon={Clock3} label="Uptime" value={formatDuration(status.connectedAt)} hint={connected ? "session" : "idle"} tone={connected ? "emerald" : "white"} />
          <SmartStatCard icon={Database} label="Data used" value={connected ? formatBytes(status.bytesIn + status.bytesOut) : "0 B"} hint="today" tone="white" />
        </section>

        <AnimatePresence>
          {connected && <ConnectionInfoPanel profile={profile} killSwitchEnabled={killSwitchEnabled} />}
        </AnimatePresence>

        <section className="grid gap-4 md:grid-cols-2">
          <SmartStatCard icon={RadioTower} label="Profile" value={profile?.name || "No profile selected"} hint={profile?.protocol || "OpenVPN"} />
          <SmartStatCard icon={Gauge} label="Endpoint" value={profile?.remoteHost || "Awaiting profile"} hint={profile?.remotePort?.toString() || "auto"}>
            <div className="flex items-center gap-2 text-xs text-white/34">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200/70" aria-hidden />
              {quickConnectProfileId ? "Ready for quick route" : "Import a profile to unlock routing"}
            </div>
          </SmartStatCard>
        </section>

        <RecentConnections recents={recents} onReconnect={onReconnect} />
      </div>
    </div>
  );
}
