import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { Button } from "./ui/button";

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
};

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-5 top-16 z-50 space-y-3">
      {toasts.map((toast) => {
        const Icon = toast.kind === "success" ? CheckCircle2 : toast.kind === "error" ? AlertTriangle : Info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-96 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-2xl"
          >
            <Icon className={toast.kind === "error" ? "mt-0.5 h-4 w-4 text-destructive" : "mt-0.5 h-4 w-4 text-primary"} />
            <p className="min-w-0 flex-1 text-sm leading-5">{toast.message}</p>
            <Button variant="ghost" size="icon" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
