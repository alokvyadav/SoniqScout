type Props = {
  peaks: number[];
  durationSec: number;
  introSec?: number;
  outroSec?: number;
  height?: number;
};

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Waveform({ peaks, durationSec, introSec = 0, outroSec, height = 180 }: Props) {
  const n = peaks.length;
  const w = 1200;
  const mid = height / 2;
  return (
    <div className="rounded-lg bg-background/50 border border-border p-4">
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="wf-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* intro shading */}
        {introSec > 0 && (
          <rect x={0} y={0} width={(introSec / durationSec) * w} height={height} fill="var(--color-primary)" opacity="0.07" />
        )}
        {outroSec != null && outroSec < durationSec && (
          <rect
            x={(outroSec / durationSec) * w}
            y={0}
            width={w - (outroSec / durationSec) * w}
            height={height}
            fill="var(--color-accent)"
            opacity="0.06"
          />
        )}
        {peaks.map((p, i) => {
          const h = Math.max(1, p * (height - 8));
          const x = (i / n) * w;
          const bw = Math.max(1, w / n - 0.5);
          return (
            <rect key={i} x={x} y={mid - h / 2} width={bw} height={h} fill="url(#wf-grad)" />
          );
        })}
      </svg>
      <div className="mt-3 flex gap-2">
        <span className="text-[10px] mono text-muted-foreground px-2 py-1 rounded border border-border">
          INTRO · {fmt(introSec)}
        </span>
        {outroSec != null && (
          <span className="text-[10px] mono text-muted-foreground px-2 py-1 rounded border border-border">
            OUTRO · {fmt(outroSec)}
          </span>
        )}
      </div>
    </div>
  );
}
