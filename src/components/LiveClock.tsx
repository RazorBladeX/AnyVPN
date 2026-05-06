import { CalendarDays, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
      <div className="flex items-center gap-2 font-mono text-lg font-semibold text-white/86">
        <Clock3 className="h-4 w-4 text-cyan-200/80" aria-hidden />
        {now.toLocaleTimeString([], { hour12: false })}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-white/38">
        <CalendarDays className="h-3.5 w-3.5 text-white/30" aria-hidden />
        {now.toLocaleDateString([], {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric"
        })}
      </div>
    </div>
  );
}
