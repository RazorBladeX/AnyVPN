import { motion } from "framer-motion";
import { PlugZap, Shield } from "lucide-react";

import { Button } from "../ui/button";
import { flagForCountry } from "../../lib/flags";
import type { RecentConnection } from "../../lib/tauri";

interface RecentConnectionsProps {
  recents: RecentConnection[];
  onReconnect: (profileId: string) => void;
}

export function RecentConnections({ recents, onReconnect }: RecentConnectionsProps) {
  if (recents.length === 0) {
    return (
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Shield className="h-6 w-6" aria-hidden />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-white">Ready to connect?</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/48">
          Import a profile to get started. Your recent missions will appear here once you connect.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/60">Recent connections</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Last secure routes</h3>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {recents.slice(0, 5).map((recent, index) => (
          <motion.div
            key={`${recent.profileId}-${recent.connectedAt}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.28 }}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 transition hover:border-cyan-300/25 hover:bg-white/[0.055]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-3xl">{flagForCountry(recent.country)}</div>
              <Button size="icon" variant="ghost" onClick={() => onReconnect(recent.profileId)} aria-label="Reconnect">
                <PlugZap className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <p className="mt-4 truncate text-sm font-semibold text-white">{recent.profileName}</p>
            <p className="mt-1 text-xs text-white/42">{new Date(recent.connectedAt).toLocaleString()}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
