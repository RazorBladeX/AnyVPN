import { Download, Filter, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import type { LogEntry, LogLevel } from "../lib/tauri";

export function LogsPage({
  logs,
  onClear,
  onExport
}: {
  logs: LogEntry[];
  onClear: () => void;
  onExport: () => void;
}) {
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => (level === "all" ? logs : logs.filter((entry) => entry.level === level)), [logs, level]);

  if (autoScroll) {
    window.requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
  }

  return (
    <Card className="min-h-[calc(100vh-9rem)]">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Live Logs</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Real-time OpenVPN output with level-aware highlighting.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-3 py-2">
              <Filter className="h-4 w-4 text-muted-foreground" aria-hidden />
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value as LogLevel | "all")}
                className="bg-transparent text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Auto-scroll
              <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            </label>
            <Button variant="outline" onClick={onExport}>
              <Download className="h-4 w-4" aria-hidden />
              Export
            </Button>
            <Button variant="outline" onClick={onClear}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[calc(100vh-16rem)] overflow-y-auto rounded-lg border border-border bg-black/45 p-4 font-mono text-xs leading-6">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground">No logs yet. Connect to a profile to stream OpenVPN output here.</p>
          ) : (
            filtered.map((entry, index) => (
              <p key={`${entry.timestamp}-${index}`} className="grid grid-cols-[178px_58px_1fr] gap-3">
                <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span
                  className={
                    entry.level === "error"
                      ? "text-destructive"
                      : entry.level === "warn"
                        ? "text-amber-300"
                        : "text-primary"
                  }
                >
                  {entry.level.toUpperCase()}
                </span>
                <span className="min-w-0 break-words text-foreground/86">{entry.message}</span>
              </p>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}
