import { motion } from "framer-motion";
import { Power, ShieldCheck, ShieldOff } from "lucide-react";

import type { ConnectionStatus } from "../../lib/tauri";
import { cn } from "../../lib/utils";

export function CompactConnectButton({
  status,
  disabled,
  onToggle
}: {
  status: ConnectionStatus;
  disabled: boolean;
  onToggle: () => void;
}) {
  const connected = status.state === "connected";
  const busy = status.state === "connecting" || status.state === "disconnecting";

  return (
    <motion.button
      type="button"
      disabled={disabled || busy}
      onClick={onToggle}
      whileHover={{ scale: disabled ? 1 : 1.025 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="group relative grid h-36 w-36 place-items-center rounded-full outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={connected ? "Disconnect VPN" : "Connect VPN"}
    >
      <motion.span
        className={cn(
          "absolute inset-0 rounded-full border",
          connected ? "border-emerald-300/45 shadow-[0_0_70px_rgba(110,231,183,0.22)]" : "border-cyan-300/24"
        )}
        animate={busy ? { scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1.35, repeat: busy ? Infinity : 0, ease: "easeInOut" }}
      />
      <span className="absolute inset-4 rounded-full border border-white/[0.06] bg-gradient-to-b from-white/[0.09] to-white/[0.025]" />
      <span
        className={cn(
          "relative grid h-20 w-20 place-items-center rounded-full transition",
          connected ? "bg-emerald-300/14 text-emerald-200" : "bg-cyan-300/10 text-cyan-100"
        )}
      >
        <Power className="h-9 w-9 transition group-hover:rotate-6" strokeWidth={1.7} aria-hidden />
      </span>
      <span className="absolute -bottom-1 grid h-8 w-8 place-items-center rounded-full border border-white/[0.08] bg-black text-white/70">
        {connected ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <ShieldOff className="h-4 w-4 text-amber-300" />}
      </span>
    </motion.button>
  );
}
