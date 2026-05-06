import { platform } from "@tauri-apps/plugin-os";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import type { AppMetadata } from "../lib/tauri";
import { cn } from "../lib/utils";

interface CustomTitleBarProps {
  metadata?: AppMetadata | null;
}

export function CustomTitleBar({ metadata }: CustomTitleBarProps) {
  const appWindow = getCurrentWindow();
  const [isMac, setMac] = useState(false);

  useEffect(() => {
    setMac(platform() === "macos");
  }, []);

  return (
    <header className="relative grid h-12 grid-cols-[1fr_auto_1fr] items-center border-b border-border bg-black/32 px-3">
      <div className="z-10 flex items-center gap-2">
        {isMac && (
          <>
            <TrafficLight tone="close" label="Close window" onClick={() => appWindow.close()} />
            <TrafficLight tone="minimize" label="Minimize window" onClick={() => appWindow.minimize()} />
            <TrafficLight tone="maximize" label="Maximize window" onClick={() => appWindow.toggleMaximize()} />
          </>
        )}
      </div>

      <div
        data-tauri-drag-region
        className="z-0 col-span-3 col-start-1 row-start-1 flex h-full items-center justify-center text-sm font-medium text-muted-foreground"
      >
        <span className="text-foreground">{metadata?.name || "AnyVPN"}</span>
        <span className="mx-2 h-1 w-1 rounded-full bg-muted-foreground/50" />
        <span>v{metadata?.version || "0.1.0"}</span>
      </div>

      <div className="z-10 col-start-3 row-start-1 flex justify-end">
        {!isMac && (
          <>
            <WindowButton label="Minimize window" onClick={() => appWindow.minimize()}>
              <Minus className="h-4 w-4" aria-hidden />
            </WindowButton>
            <WindowButton label="Maximize window" onClick={() => appWindow.toggleMaximize()}>
              <Square className="h-3.5 w-3.5" aria-hidden />
            </WindowButton>
            <WindowButton label="Close window" danger onClick={() => appWindow.close()}>
              <X className="h-4 w-4" aria-hidden />
            </WindowButton>
          </>
        )}
      </div>
    </header>
  );
}

function TrafficLight({
  tone,
  label,
  onClick
}: {
  tone: "close" | "minimize" | "maximize";
  label: string;
  onClick: () => void;
}) {
  const color = tone === "close" ? "bg-[#ff5f57]" : tone === "minimize" ? "bg-[#ffbd2e]" : "bg-[#28c840]";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn("h-3 w-3 rounded-full opacity-90 ring-1 ring-black/25 transition hover:scale-110", color)}
    />
  );
}

function WindowButton({
  label,
  danger,
  onClick,
  children
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseDown={(event) => event.stopPropagation()}
      className={cn(
        "grid h-12 w-12 place-items-center text-muted-foreground transition hover:bg-white/10 hover:text-foreground",
        danger && "hover:bg-destructive hover:text-destructive-foreground"
      )}
    >
      {children}
    </button>
  );
}
