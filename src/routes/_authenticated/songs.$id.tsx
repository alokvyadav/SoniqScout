import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/audio/Ring";
import { Waveform } from "@/components/audio/Waveform";
import { SpectrumBars } from "@/components/audio/SpectrumBars";
import { TonalBalance } from "@/components/audio/TonalBalance";
import { MetricStat } from "@/components/audio/MetricStat";
import { Activity, AudioLines, Music2, Radio, Waves } from "lucide-react";
import type { AudioMetrics } from "@/lib/audio-analyzer";

export const Route = createFileRoute("/_authenticated/songs/$id")({
  head: () => ({ meta: [{ title: "Review — SONIQ" }] }),
  component: SongPage,
});

function fmtDur(s?: number | null) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function toneFor(value: number, ok: (v: number) => boolean, warn: (v: number) => boolean) {
  if (ok(value)) return "ok" as const;
  if (warn(value)) return "warn" as const;
  return "bad" as const;
}

function SongPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["song", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*, analyses(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {isLoading && <div className="panel p-12 text-center mono text-sm text-muted-foreground">Loading review...</div>}
        {error && <div className="panel p-12 text-center text-destructive">Couldn't load this track.</div>}

        {data && (() => {
          const a: any = Array.isArray(data.analyses) ? data.analyses[0] : data.analyses;
          const m: AudioMetrics | undefined = a?.metrics && Object.keys(a.metrics).length ? a.metrics : undefined;
          return (
            <>
              {/* Header */}
              <div className="text-[10px] tracking-widest mono text-muted-foreground">ANALYSIS REPORT</div>
              <h1 className="mt-2 font-display font-bold mono text-3xl md:text-5xl leading-tight break-words">
                {data.title}
              </h1>
              <div className="mt-2 text-sm text-muted-foreground mono">
                {fmtDur(data.duration_seconds)} · {data.sample_rate ? `${(data.sample_rate / 1000).toFixed(0)} kHz` : "—"} · {data.channels === 1 ? "Mono" : "Stereo"}
              </div>
              <div className="mt-4">
                <Link to="/dashboard">
                  <Button variant="secondary" size="sm">
                    <Activity className="size-4 mr-2" /> Analyze another
                  </Button>
                </Link>
              </div>

              {/* Score rings */}
              {a && (
                <div className="panel mt-6 p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 items-center">
                    <div className="md:row-span-2 flex flex-col items-center">
                      <Ring value={Number(a.overall_score)} size={196} thickness={10} />
                      <div className="mt-3 text-sm font-semibold">Overall Rating</div>
                      <div className="text-xs text-muted-foreground">
                        {Number(a.overall_score) >= 8 ? "Strong mix — minor polish" : Number(a.overall_score) >= 6.5 ? "Solid foundation — clear next steps" : "Needs work — focus on basics"}
                      </div>
                    </div>
                    <Ring value={Number(a.mix_score)} label="Mixing" />
                    <Ring value={Number(a.master_score)} label="Mastering" />
                    <Ring value={Number(a.arrangement_score)} label="Structure" />
                    {m && <Ring value={Math.min(10, Math.max(0, 10 - Math.abs(m.lufs + 14) * 0.6))} label="Loudness" />}
                    {m && <Ring value={Math.min(10, Math.max(0, (m.dynamicRangeDb - 4) * 0.9))} label="Dynamics" />}
                    {m && <Ring value={Math.min(10, m.stereoWidthPct / 10 + (m.stereoCorrelation > 0 ? 2 : 0))} label="Stereo" />}
                  </div>
                </div>
              )}

              {/* Waveform */}
              {m && (
                <section className="panel mt-6 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AudioLines className="size-4 text-primary" />
                    <h2 className="text-base font-semibold mono">Waveform &amp; Structure</h2>
                  </div>
                  <Waveform
                    peaks={m.peaks}
                    durationSec={m.durationSec}
                    introSec={m.introSec}
                    outroSec={m.outroSec}
                  />
                </section>
              )}

              {/* Engineering metric grid */}
              {m && (
                <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                  <MetricStat
                    label="INTEGRATED LOUDNESS"
                    value={m.lufs.toFixed(1)}
                    unit="LUFS"
                    hint="Streaming target: -14"
                    tone={toneFor(m.lufs, v => v >= -16 && v <= -12, v => v >= -20 && v <= -8)}
                  />
                  <MetricStat
                    label="TRUE PEAK"
                    value={m.truePeakDb.toFixed(2)}
                    unit="dBTP"
                    hint="Headroom target: ≤ -1"
                    tone={toneFor(m.truePeakDb, v => v <= -1, v => v <= -0.1)}
                  />
                  <MetricStat
                    label="DYNAMIC RANGE"
                    value={m.dynamicRangeDb.toFixed(1)}
                    unit="dB"
                    hint="Modern: 8–14 dB"
                    tone={toneFor(m.dynamicRangeDb, v => v >= 8 && v <= 14, v => v >= 5 && v <= 18)}
                  />
                  <MetricStat
                    label="CREST FACTOR"
                    value={m.crestDb.toFixed(1)}
                    unit="dB"
                    hint="Peak – RMS"
                  />
                  <MetricStat
                    label="STEREO WIDTH"
                    value={m.stereoWidthPct}
                    unit="%"
                    hint="Mid / Side ratio"
                    tone={toneFor(m.stereoWidthPct, v => v >= 25 && v <= 70, v => v >= 10 && v <= 85)}
                  />
                  <MetricStat
                    label="STEREO CORRELATION"
                    value={m.stereoCorrelation.toFixed(2)}
                    unit=""
                    hint="Mono compat (1 ideal)"
                    tone={toneFor(m.stereoCorrelation, v => v >= 0.3, v => v >= 0)}
                  />
                  <MetricStat
                    label="CLIPPING"
                    value={m.clippingPct.toFixed(2)}
                    unit="%"
                    hint="Samples near 0 dBFS"
                    tone={toneFor(m.clippingPct, v => v < 0.01, v => v < 0.1)}
                  />
                  <MetricStat
                    label="RMS LEVEL"
                    value={m.rmsDb.toFixed(1)}
                    unit="dBFS"
                  />
                </section>
              )}

              {/* Spectrum & tonal balance */}
              {m && (
                <section className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="panel p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Waves className="size-4 text-primary" />
                      <h2 className="text-base font-semibold mono">Frequency Spectrum</h2>
                    </div>
                    <SpectrumBars spectrum={m.spectrum} />
                    <div className="mt-2 flex justify-between text-[9px] mono text-muted-foreground">
                      <span>30 Hz</span><span>500 Hz</span><span>5 kHz</span><span>20 kHz</span>
                    </div>
                  </div>
                  <div className="panel p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Radio className="size-4 text-primary" />
                      <h2 className="text-base font-semibold mono">Tonal Balance</h2>
                    </div>
                    <TonalBalance values={m.tonalBalance} />
                  </div>
                </section>
              )}

              {/* Diagnostic dual cards */}
              {m && (
                <section className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="panel p-6 flex items-center gap-6">
                    <Ring value={m.vocalClarity} size={120} thickness={8} />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Estimated from presence-band energy vs. low-mid mud. Higher means vocals sit forward and intelligible.</div>
                      <div className="mt-3 font-semibold">Vocal Clarity</div>
                    </div>
                  </div>
                  <div className="panel p-6 flex items-center gap-6">
                    <Ring value={m.separation} size={120} thickness={8} />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Combination of stereo spread and dynamic transient preservation — how distinct elements feel.</div>
                      <div className="mt-3 font-semibold">Instrument Separation</div>
                    </div>
                  </div>
                </section>
              )}

              {/* Producer notes */}
              {a && (
                <section className="panel mt-6 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Music2 className="size-4 text-primary" />
                    <h2 className="text-base font-semibold mono">Producer Notes</h2>
                  </div>
                  <ol className="space-y-3">
                    {[...(a.improvements as string[] ?? []), ...(a.technical_notes as string[] ?? [])].map((line, i) => (
                      <li key={i} className="flex gap-4 text-sm leading-relaxed">
                        <span className="mono text-primary text-xs pt-0.5 w-6 shrink-0">{(i + 1).toString().padStart(2, "0")}</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Verdict + strengths */}
              {a && (
                <section className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="panel p-6 md:col-span-2">
                    <p className="text-base leading-relaxed">{a.summary}</p>
                  </div>
                  <div className="panel p-6">
                    <ul className="space-y-2 text-sm">
                      {(a.strengths as string[] ?? []).map((s, i) => (
                        <li key={i} className="border-l-2 border-primary/40 pl-3">{s}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              <div className="mt-10 text-center text-xs text-muted-foreground">
                Analysis performed entirely in-browser. No audio leaves your device beyond your own private storage.
              </div>
            </>
          );
        })()}
      </main>
    </div>
  );
}
