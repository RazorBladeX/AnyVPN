import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subvalue?: string;
  accent?: "cyan" | "green" | "white";
  children?: ReactNode;
}

export function MetricCard({ icon: Icon, label, value, subvalue, accent = "cyan", children }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-white/[0.055]"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full border",
              accent === "green" && "border-emerald-300/20 bg-emerald-300/10 text-emerald-300",
              accent === "cyan" && "border-cyan-300/20 bg-cyan-300/10 text-cyan-300",
              accent === "white" && "border-white/15 bg-white/8 text-white"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/42">{label}</p>
        </div>
        {subvalue && <p className="text-xs text-white/38">{subvalue}</p>}
      </div>
      <p className="mt-5 truncate text-2xl font-semibold tracking-normal text-white">{value}</p>
      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  );
}
