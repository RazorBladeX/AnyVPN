import { open } from "@tauri-apps/plugin-dialog";
import { CheckCircle2, FileUp, Loader2, MapPin, ShieldCheck, X } from "lucide-react";
import { useCallback, useState } from "react";

import { lookupHostLocation } from "../lib/ipLookup";
import { api, type Profile, type ProfileImportPreview } from "../lib/tauri";
import { Button } from "./ui/button";

type WizardStep = "idle" | "parsing" | "locating" | "saving" | "complete" | "error";

interface ProfileImportWizardProps {
  onImported: (profile: Profile) => void;
  onToast: (kind: "success" | "error" | "info", message: string) => void;
}

export function ProfileImportWizard({ onImported, onToast }: ProfileImportWizardProps) {
  const [isDragging, setDragging] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("idle");
  const [sourcePath, setSourcePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProfileImportPreview | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const startImport = useCallback(
    async (path?: string | null) => {
      if (!path) return;
      setOpen(true);
      setSourcePath(path);
      setError(null);
      setCancelled(false);
      setPreview(null);
      setDetectedCountry(null);

      try {
        setStep("parsing");
        const nextPreview = await api.previewProfileImport(path);
        setPreview(nextPreview);

        let country = nextPreview.country || null;
        if (nextPreview.remoteHost) {
          setStep("locating");
          try {
            const lookup = await lookupHostLocation(nextPreview.remoteHost);
            country = lookup.country || lookup.flagCountry || country;
            setDetectedCountry(country);
          } catch {
            setDetectedCountry(country);
          }
        }

        setStep("saving");
        const profile = await api.importProfile(path);
        const finalProfile = country && country !== profile.country
          ? await api.updateProfileLocation(profile.id, country)
          : profile;
        setStep("complete");
        onImported(finalProfile);
        onToast("success", `Imported ${finalProfile.name}.`);
      } catch (reason) {
        setStep("error");
        setError(String(reason));
        onToast("error", String(reason));
      } finally {
        setDragging(false);
      }
    },
    [onImported, onToast]
  );

  async function browse() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "VPN profile", extensions: ["ovpn", "conf"] }]
    });
    if (typeof selected === "string") {
      await startImport(selected);
    }
  }

  function closeWizard() {
    setCancelled(true);
    setOpen(false);
    setStep("idle");
  }

  return (
    <>
      <div
        className={`rounded-lg border border-dashed p-8 transition ${
          isDragging ? "border-primary bg-primary/10 shadow-glow" : "border-white/15 bg-white/[0.03] hover:border-primary/50"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={async (event) => {
          event.preventDefault();
          const file = event.dataTransfer.files.item(0) as (File & { path?: string }) | null;
          await startImport(file?.path);
        }}
      >
        <div className="flex items-center gap-5">
          <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/12 text-primary">
            <FileUp className="h-7 w-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">Import OpenVPN profile</p>
            <p className="mt-1 text-sm text-muted-foreground">Drop a .ovpn file here. AnyVPN validates, parses, and detects location before saving.</p>
          </div>
          <Button type="button" variant="outline" onClick={browse}>
            Browse
          </Button>
        </div>
      </div>

      {isOpen && !cancelled && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Import profile</h2>
                <p className="mt-1 max-w-md truncate text-sm text-muted-foreground">{sourcePath || "OpenVPN profile"}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeWizard} aria-label="Cancel import">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              <WizardRow active={step === "parsing"} done={Boolean(preview)} icon={ShieldCheck} title="Uploading & Parsing..." detail="Checking directives and extracting server metadata." />
              <WizardRow active={step === "locating"} done={Boolean(detectedCountry || preview?.country)} icon={MapPin} title="Detecting location" detail={detectedCountry || preview?.country || preview?.remoteHost || "Resolving remote server location."} />
              <WizardRow active={step === "saving"} done={step === "complete"} icon={CheckCircle2} title="Saving securely" detail="Copying profile and referenced certificate assets into app data." />
            </div>

            {preview && (
              <div className="mt-5 rounded-lg border border-border bg-white/[0.03] p-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info label="Name" value={preview.name} />
                  <Info label="Backend" value={preview.backend === "wireguard" ? "WireGuard" : "OpenVPN"} />
                  <Info label="Protocol" value={preview.protocol || "OpenVPN"} />
                  <Info label="Remote" value={preview.remoteHost || "Unknown"} />
                  <Info label="Country" value={detectedCountry || preview.country || "Unknown"} />
                </div>
              </div>
            )}

            {error && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end">
              <Button onClick={closeWizard}>{step === "complete" ? "Done" : "Cancel"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WizardRow({
  active,
  done,
  icon: Icon,
  title,
  detail
}: {
  active: boolean;
  done: boolean;
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.03] p-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/[0.06] text-primary">
        {active ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Icon className="h-5 w-5" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      {done && <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}
