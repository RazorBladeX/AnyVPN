import { Check, Copy, MapPin, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "../ui/button";
import { flagForCountry } from "../../lib/flags";

interface IpLocationBarProps {
  ip: string;
  location: string;
  connected: boolean;
  onRefresh: () => void;
}

export function IpLocationBar({ ip, location, connected, onRefresh }: IpLocationBarProps) {
  const [copied, setCopied] = useState(false);

  async function copyIp() {
    await navigator.clipboard.writeText(ip);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-white/[0.07] bg-black/24 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/34">
          {connected ? "VPN endpoint" : "Public footprint"}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <p className="truncate font-mono text-3xl font-semibold tracking-[-0.04em] text-white">{ip}</p>
          <Button variant="ghost" size="icon" onClick={copyIp} aria-label="Copy IP address">
            {copied ? <Check className="h-4 w-4 text-emerald-300" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
          <span className="text-3xl">{flagForCountry(location)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/34">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Location
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">{location}</p>
          </div>
        </div>
        {!connected && (
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        )}
      </div>
    </section>
  );
}
