import { motion } from "framer-motion";
import { LockKeyhole, RadioTower, ShieldCheck, TimerReset } from "lucide-react";

import type { Profile } from "../../lib/tauri";

interface ConnectionInfoPanelProps {
  profile: Profile | null;
  killSwitchEnabled: boolean;
}

export function ConnectionInfoPanel({ profile, killSwitchEnabled }: ConnectionInfoPanelProps) {
  if (!profile) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      className="mx-auto max-w-4xl rounded-3xl border border-cyan-300/12 bg-cyan-300/[0.035] p-6"
    >
      <div className="grid gap-5 md:grid-cols-4">
        <Info icon={RadioTower} label="Protocol" value={profile.protocol || "OpenVPN"} />
        <Info icon={LockKeyhole} label="Server" value={profile.remoteHost || "Private endpoint"} />
        <Info icon={TimerReset} label="Ping" value="Pending" />
        <Info icon={ShieldCheck} label="Kill-switch" value={killSwitchEnabled ? "Armed" : "Standby"} />
      </div>
    </motion.section>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof RadioTower; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/38">
        <Icon className="h-4 w-4 text-cyan-200/80" aria-hidden />
        {label}
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
