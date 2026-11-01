import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Activity, AudioWaveform, Gauge, Sparkles, Upload, BarChart3, Headphones, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SONIQ — AI mixing & mastering reviews" },
      { name: "description", content: "Upload a track. Get a studio-grade AI review with mix, master, arrangement, and commercial readiness scores in under a minute." },
      { property: "og:title", content: "SONIQ — AI mixing & mastering reviews" },
      { property: "og:description", content: "Studio-grade AI feedback for your tracks." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mono">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            v2.0 — multi-model review engine
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            Studio-grade <span className="text-primary glow-text">AI feedback</span> on every track you ship.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Upload a WAV or MP3. SONIQ scores your mix, master, arrangement and commercial readiness — with specific, actionable notes from a virtual mastering engineer.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link to="/auth"><Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-12">
              <Upload className="mr-2 size-4" /> Analyze a track
            </Button></Link>
            <a href="#how" className="inline-flex items-center justify-center h-12 px-5 rounded-md border border-border text-sm hover:bg-card/60">
              How it works
            </a>
          </div>

        </div>
      </section>

      {/* How */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="flex items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="mt-2 text-3xl md:text-4xl font-bold">From upload to verdict in under 60 seconds.</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Upload, t: "01 — Upload", d: "Drop a WAV or MP3. Your file is stored privately in your studio." },
            { icon: Sparkles, t: "02 — Analyze", d: "Multi-model engine evaluates mix, master, arrangement, and commercial fit." },
            { icon: BarChart3, t: "03 — Review", d: "Get a scored breakdown plus specific, frequency-aware fix suggestions." },
          ].map((s) => (
            <div key={s.t} className="panel p-6">
              <s.icon className="size-5 text-primary" />
              <div className="mt-4 text-xs mono text-muted-foreground">{s.t.split(" — ")[0]}</div>
              <div className="text-lg font-semibold mt-1">{s.t.split(" — ")[1]}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mt-2 text-3xl md:text-4xl font-bold max-w-2xl">Built for producers who ship.</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-4">
          {[
            { icon: Gauge, t: "Five scored axes", d: "Mix · Master · Arrangement · Commercial · Technical. Weighted into one overall." },
            { icon: Headphones, t: "Producer-grade notes", d: "Specific call-outs: '60–80 Hz kick masking', 'chorus +3 dB hotter than verse'." },
            { icon: AudioWaveform, t: "Genre-aware", d: "Detected genre informs benchmarks against commercial reference loudness." },
            { icon: Zap, t: "Private by default", d: "Your stems and masters never go public. RLS-isolated per account." },
          ].map((f) => (
            <div key={f.t} className="panel p-6 flex gap-4">
              <div className="shrink-0 size-10 rounded-md bg-primary/10 grid place-items-center text-primary">
                <f.icon className="size-5" />
              </div>
              <div>
                <div className="font-semibold">{f.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="panel p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-lines opacity-20" />
          <h3 className="relative text-3xl md:text-4xl font-bold">Ready to hear what your track scores?</h3>
          <p className="relative mt-3 text-muted-foreground">Free to start. No plugin install.</p>
          <div className="relative mt-8">
            <Link to="/auth"><Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6">Start your first review</Button></Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground mono">
        SONIQ · AI mixing & mastering reviews
      </footer>
    </div>
  );
}
