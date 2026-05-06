import { motion } from "framer-motion";
import { Power } from "lucide-react";

import type { ConnectionStatus } from "../../lib/tauri";
import { cn } from "../../lib/utils";

interface ConnectOrbProps {
  status: ConnectionStatus;
  disabled: boolean;
  onToggle: () => void;
}

export function ConnectOrb({ status, disabled, onToggle }: ConnectOrbProps) {
  const connected = status.state === "connected";
  const connecting = status.state === "connecting" || status.state === "disconnecting";
  const active = connected || connecting;

  return (
    <motion.button
      type="button"
      aria-label={active ? "Disconnect VPN" : "Connect VPN"}
      disabled={disabled || connecting}
      onClick={onToggle}
      whileHover={{ scale: disabled ? 1 : 1.025 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="relative grid h-60 w-60 place-items-center rounded-full outline-none transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      <motion.span
        className={cn(
          "absolute inset-0 rounded-full border",
          active ? "border-cyan-300/45 shadow-[0_0_120px_rgba(34,211,238,0.24)]" : "border-white/10"
        )}
        animate={connecting ? { scale: [1, 1.08, 1], opacity: [0.55, 0.9, 0.55] } : { scale: 1, opacity: 1 }}
        transition={{ duration: 1.6, repeat: connecting ? Infinity : 0, ease: "easeInOut" }}
      />
      <span className="absolute inset-6 rounded-full border border-white/[0.06] bg-gradient-to-b from-white/[0.08] to-white/[0.02]" />
      <span
        className={cn(
          "relative grid h-28 w-28 place-items-center rounded-full border transition duration-300",
          connected
            ? "border-emerald-300/45 bg-emerald-300/15 text-emerald-200 shadow-[0_0_70px_rgba(110,231,183,0.24)]"
            : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
        )}
      >
        <Power className="h-12 w-12" strokeWidth={1.7} aria-hidden />
      </span>
    </motion.button>
  );
}
