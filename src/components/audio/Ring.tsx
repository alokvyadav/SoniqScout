type Props = {
  value: number;        // 0..max
  max?: number;
  label?: string;
  sublabel?: string;
  size?: number;
  thickness?: number;
};

function colorFor(v: number, max: number) {
  const ratio = v / max;
  if (ratio >= 0.78) return "var(--color-meter-mid)";       // green
  if (ratio >= 0.6) return "var(--color-warn)";             // amber
  return "var(--color-meter-hot)";                          // red
}

export function Ring({ value, max = 10, label, sublabel, size = 132, thickness = 8 }: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.max(0, Math.min(1, value / max));
  const offset = c * (1 - ratio);
  const color = colorFor(value, max);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth={thickness} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={thickness} fill="none"
            strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center leading-none">
            <div className="text-3xl font-display font-semibold mono">{value.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground mono mt-1">/ {max.toFixed(0)}</div>
          </div>
        </div>
      </div>
      {label && <div className="mt-3 text-sm font-semibold">{label}</div>}
      {sublabel && <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>}
    </div>
  );
}
