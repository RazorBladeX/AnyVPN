import { Activity, Home, List, Settings, Shield } from "lucide-react";

import { LiveClock } from "./LiveClock";
import { cn } from "../lib/utils";

export type Page = "home" | "profiles" | "logs" | "settings";

const navItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "profiles", label: "Profiles", icon: List },
  { id: "logs", label: "Logs", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings }
] satisfies Array<{ id: Page; label: string; icon: typeof Home }>;

export function AppSidebar({
  page,
  onPageChange
}: {
  page: Page;
  onPageChange: (page: Page) => void;
}) {
  return (
    <aside className="flex w-64 flex-col border-r border-border bg-black/22">
      <div className="flex h-20 items-center gap-3 px-5">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-glow">
          <Shield className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold">AnyVPN</h1>
          <p className="text-xs text-muted-foreground">Secure OpenVPN client</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                page === item.id
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="space-y-3 border-t border-border p-4">
        <LiveClock />
        <p className="text-xs leading-5 text-muted-foreground">
          OpenVPN sidecar or system binary required for real VPN connections.
        </p>
      </div>
    </aside>
  );
}
