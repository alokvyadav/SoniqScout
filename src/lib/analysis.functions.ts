import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAiConfig } from "@/lib/config.server";

const AnalysisSchema = z.object({
  mix_score: z.number().min(0).max(10),
  master_score: z.number().min(0).max(10),
  arrangement_score: z.number().min(0).max(10),
  similarity_score: z.number().min(0).max(10),
  technical_score: z.number().min(0).max(10),
  detected_genre: z.string().max(60),
  summary: z.string().max(800),
  strengths: z.array(z.string().max(240)).min(2).max(6),
  improvements: z.array(z.string().max(240)).min(2).max(6),
  technical_notes: z.array(z.string().max(240)).min(2).max(6),
});

const MetricsSchema = z.object({
  durationSec: z.number(),
  sampleRate: z.number(),
  channels: z.number(),
  lufs: z.number(),
  truePeakDb: z.number(),
  rmsDb: z.number(),
  crestDb: z.number(),
  dynamicRangeDb: z.number(),
  stereoWidthPct: z.number(),
  stereoCorrelation: z.number(),
  clippingPct: z.number(),
  vocalClarity: z.number(),
  separation: z.number(),
  peaks: z.array(z.number()).max(2000),
  spectrum: z.array(z.number()).max(256),
  tonalBalance: z.array(z.number()).max(16),
  introSec: z.number(),
  outroSec: z.number(),
});

const Input = z.object({
  song_id: z.string().uuid(),
  metrics: MetricsSchema,
});

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export const analyzeSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = data.metrics;

    const { data: song, error: songErr } = await supabase
      .from("songs")
      .select("*")
      .eq("id", data.song_id)
      .single();
    if (songErr || !song) throw new Error("Song not found");

    const ai = getAiConfig();

    const tonalLabels = ["sub", "bass", "lo-mid", "mid", "hi-mid", "high", "air"];
    const tonalSummary = m.tonalBalance
      .map((v, i) => `${tonalLabels[i]}:${(v * 100).toFixed(0)}`).join(" ");

    const prompt = `You are a senior mixing and mastering engineer reviewing a track. You DO have real measured metrics from the user's audio file (computed in-browser). Use them to be specific and technical. Never invent fake LUFS / dB numbers — only use the measured ones below.

Track metadata:
- Title: ${song.title}
- Artist: ${song.artist || "Unknown"}
- Stated genre: ${song.genre || "Unspecified"}
- Artist notes: ${song.notes || "(none)"}

Measured metrics:
- Duration: ${m.durationSec.toFixed(1)} s, ${m.sampleRate} Hz, ${m.channels} ch
- Integrated loudness: ${m.lufs.toFixed(1)} LUFS (streaming target ~ -14)
- True peak: ${m.truePeakDb.toFixed(2)} dBTP (headroom target <= -1)
- RMS: ${m.rmsDb.toFixed(1)} dBFS · Crest: ${m.crestDb.toFixed(1)} dB · Dynamic range: ${m.dynamicRangeDb.toFixed(1)} dB
- Stereo width: ${m.stereoWidthPct}% · Correlation: ${m.stereoCorrelation.toFixed(2)} (1 = mono safe)
- Clipping: ${m.clippingPct.toFixed(3)}% of samples near 0 dBFS
- Tonal balance (normalized 0-100): ${tonalSummary}
- Vocal-clarity proxy: ${m.vocalClarity.toFixed(1)}/10 · Instrument separation: ${m.separation.toFixed(1)}/10

Return ONLY this JSON shape:
{
  "mix_score": number 0-10 (1 decimal),
  "master_score": number 0-10,
  "arrangement_score": number 0-10,
  "similarity_score": number 0-10 (commercial readiness vs genre benchmarks),
  "technical_score": number 0-10 (loudness/headroom/format hygiene),
  "detected_genre": string,
  "summary": 2-3 sentence overall verdict referencing the actual measurements,
  "strengths": 3-4 specific positives tied to the metrics,
  "improvements": 3-4 specific actionable fixes — mention exact Hz, dB and the measured numbers,
  "technical_notes": 3-4 lines about LUFS/peaks/stereo/dynamics using the measured values
}`;

    // Any OpenAI-compatible chat-completions endpoint works (Gemini, OpenAI, OpenRouter, ...).
    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: "You output only valid JSON. No prose, no markdown fences." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
    if (res.status === 401 || res.status === 403)
      throw new Error("AI key rejected. Check AI_API_KEY / AI_BASE_URL in your environment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Check your AI provider billing.");
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${await res.text()}`);

    const payload = await res.json();
    const raw: string | undefined = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty AI response");

    let parsed;
    try {
      // Some providers wrap JSON in ```json fences despite instructions; strip them.
      const cleaned = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      parsed = AnalysisSchema.parse(JSON.parse(cleaned));
    } catch (e) {
      throw new Error("AI returned malformed analysis: " + (e instanceof Error ? e.message : String(e)));
    }

    const overall = round1(
      0.35 * parsed.mix_score +
      0.25 * parsed.master_score +
      0.20 * parsed.arrangement_score +
      0.10 * parsed.similarity_score +
      0.10 * parsed.technical_score
    );

    const { data: analysis, error: insErr } = await supabase
      .from("analyses")
      .upsert(
        {
          song_id: song.id,
          user_id: userId,
          mix_score: round1(parsed.mix_score),
          master_score: round1(parsed.master_score),
          arrangement_score: round1(parsed.arrangement_score),
          similarity_score: round1(parsed.similarity_score),
          technical_score: round1(parsed.technical_score),
          overall_score: overall,
          detected_genre: parsed.detected_genre,
          summary: parsed.summary,
          strengths: parsed.strengths,
          improvements: parsed.improvements,
          technical_notes: parsed.technical_notes,
          metrics: m,
        },
        { onConflict: "song_id" }
      )
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    await supabase
      .from("songs")
      .update({
        status: "analyzed",
        duration_seconds: m.durationSec,
        sample_rate: m.sampleRate,
        channels: m.channels,
      })
      .eq("id", song.id);

    return { analysis_id: analysis.id };
  });
