import { cn } from "../lib/utils";

export function SpeedSparkline({ values, color = "primary" }: { values: number[]; color?: "primary" | "accent" }) {
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 36 - (value / max) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-12 w-full" role="img" aria-label="Speed history">
      <polyline
        points={points}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(color === "primary" ? "stroke-primary" : "stroke-accent")}
      />
    </svg>
  );
}
