const LABELS = ["SUB", "BASS", "LO-MID", "MID", "HI-MID", "HIGH", "AIR"];

export function TonalBalance({ values, height = 180 }: { values: number[]; height?: number }) {
  const n = values.length;
  const w = 600;
  const bw = w / n;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="tb-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
        {values.map((v, i) => {
          const h = Math.max(2, v * (height - 20));
          return (
            <rect key={i} x={i * bw + 6} y={height - h} width={bw - 12} height={h} rx={4} fill="url(#tb-grad)" />
          );
        })}
      </svg>
      <div className="grid grid-cols-7 mt-2 text-[9px] mono text-muted-foreground text-center">
        {LABELS.map((l) => <div key={l}>{l}</div>)}
      </div>
    </div>
  );
}
