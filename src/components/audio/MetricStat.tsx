type Tone = "ok" | "warn" | "bad" | "muted";

const dotClass: Record<Tone, string> = {
  ok: "bg-[var(--color-meter-mid)]",
  warn: "bg-[var(--color-warn)]",
  bad: "bg-[var(--color-meter-hot)]",
  muted: "bg-muted-foreground/40",
};

export function MetricStat({
  label,
  value,
  unit,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-lg bg-background/50 border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-widest mono text-muted-foreground">{label}</div>
        <span className={`size-2 rounded-full ${dotClass[tone]}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <div className="text-3xl font-display font-semibold mono">{value}</div>
        {unit && <div className="text-xs mono text-muted-foreground">{unit}</div>}
      </div>
      {hint && <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
