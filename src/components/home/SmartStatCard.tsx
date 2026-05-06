import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface SmartStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "cyan" | "emerald" | "amber" | "white";
  children?: ReactNode;
}

export function SmartStatCard({ icon: Icon, label, value, hint, tone = "cyan", children }: SmartStatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl border border-white/[0.07] bg-white/[0.032] p-4 shadow-[0_18px_70px_rgba(0,0,0,0.18)] backdrop-blur transition hover:border-cyan-300/20 hover:bg-white/[0.052]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-xl",
              tone === "cyan" && "bg-cyan-300/10 text-cyan-200",
              tone === "emerald" && "bg-emerald-300/10 text-emerald-200",
              tone === "amber" && "bg-amber-300/10 text-amber-200",
              tone === "white" && "bg-white/8 text-white/80"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/38">{label}</span>
        </div>
        {hint && <span className="text-xs text-white/32">{hint}</span>}
      </div>
      <div className="mt-4 text-xl font-semibold tracking-[-0.02em] text-white">{value}</div>
      {children && <div className="mt-3">{children}</div>}
    </motion.div>
  );
}
