import { ArrowUpDown, Edit3, PlugZap, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { ProfileImportWizard } from "../components/ProfileImportWizard";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { flagForCountry } from "../lib/flags";
import type { Profile } from "../lib/tauri";

export function ProfilesPage({
  profiles,
  selectedId,
  onImported,
  onConnect,
  onSelect,
  onRename,
  onDelete,
  onToast
}: {
  profiles: Profile[];
  selectedId: string | null;
  onImported: (profile: Profile) => void;
  onConnect: (profileId: string) => void;
  onSelect: (profileId: string) => void;
  onRename: (profile: Profile) => void;
  onDelete: (profile: Profile) => void;
  onToast: (kind: "success" | "error" | "info", message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "recent">("recent");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles
      .filter((profile) =>
        !normalized ||
        [profile.name, profile.country, profile.remoteHost, profile.protocol]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalized))
      )
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return new Date(b.lastConnectedAt || b.importedAt).getTime() - new Date(a.lastConnectedAt || a.importedAt).getTime();
      });
  }, [profiles, query, sortBy]);

  return (
    <div className="space-y-6">
      <ProfileImportWizard
        onImported={onImported}
        onToast={onToast}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>Profiles</CardTitle>
            <div className="flex gap-3">
              <div className="relative w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search profiles" className="pl-9" />
              </div>
              <Button variant="outline" onClick={() => setSortBy(sortBy === "recent" ? "name" : "recent")}>
                <ArrowUpDown className="h-4 w-4" aria-hidden />
                {sortBy === "recent" ? "Recent" : "Name"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
              No profiles match your search.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelect(profile.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedId === profile.id ? "border-primary/60 bg-primary/10" : "border-border bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-3xl">{flagForCountry(profile.country)}</div>
                      <p className="mt-3 truncate text-base font-semibold">{profile.name}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{profile.remoteHost || "Unknown server"}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); onRename(profile); }} aria-label="Edit profile">
                        <Edit3 className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); onDelete(profile); }} aria-label="Delete profile">
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Last used {profile.lastConnectedAt ? new Date(profile.lastConnectedAt).toLocaleDateString() : "never"}
                    </p>
                    <Button size="sm" onClick={(event) => { event.stopPropagation(); onConnect(profile.id); }}>
                      <PlugZap className="h-4 w-4" aria-hidden />
                      Connect
                    </Button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
