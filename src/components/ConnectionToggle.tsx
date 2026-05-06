import { motion } from "framer-motion";
import { Power } from "lucide-react";

import type { ConnectionStatus } from "../lib/tauri";
import { cn } from "../lib/utils";

interface ConnectionToggleProps {
  status: ConnectionStatus;
  disabled: boolean;
  onToggle: () => void;
}

export function ConnectionToggle({ status, disabled, onToggle }: ConnectionToggleProps) {
  const active = status.state === "connected" || status.state === "connecting";
  const busy = status.state === "connecting" || status.state === "disconnecting";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onToggle}
      disabled={disabled || busy}
      className={cn(
        "relative grid h-56 w-56 place-items-center rounded-full border outline-none transition focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-primary/70 bg-primary/18 shadow-[0_0_80px_rgba(62,211,158,0.23)]"
          : "border-white/14 bg-white/[0.04] hover:border-primary/50"
      )}
      aria-label={active ? "Disconnect VPN" : "Connect VPN"}
    >
      <span
        className={cn(
          "absolute inset-4 rounded-full border transition",
          active ? "border-primary/30" : "border-white/8"
        )}
      />
      <span
        className={cn(
          "grid h-24 w-24 place-items-center rounded-full transition",
          active ? "bg-primary text-primary-foreground" : "bg-white/8 text-foreground"
        )}
      >
        <Power className="h-10 w-10" aria-hidden />
      </span>
      {busy && <span className="absolute inset-0 animate-ping rounded-full border border-primary/20" />}
    </motion.button>
  );
}
