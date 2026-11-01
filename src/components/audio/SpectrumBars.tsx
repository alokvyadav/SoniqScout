export function SpectrumBars({ spectrum, height = 180 }: { spectrum: number[]; height?: number }) {
  const n = spectrum.length;
  const w = 600;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="spec-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-primary)" />
        </linearGradient>
      </defs>
      {/* baseline grid */}
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={w} y1={height * g} y2={height * g} stroke="var(--color-border)" strokeDasharray="2 4" />
      ))}
      {spectrum.map((v, i) => {
        const bw = w / n;
        const h = Math.max(1, v * (height - 8));
        return (
          <rect key={i} x={i * bw + 1} y={height - h} width={bw - 2} height={h} fill="url(#spec-grad)" rx={1} />
        );
      })}
    </svg>
  );
}
