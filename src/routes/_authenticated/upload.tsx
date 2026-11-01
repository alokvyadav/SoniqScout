import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { analyzeSong } from "@/lib/analysis.functions";
import { analyzeAudioFile } from "@/lib/audio-analyzer";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload — SONIQ" }] }),
  component: UploadPage,
});

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function UploadPage() {
  const navigate = useNavigate();
  const runAnalyze = useServerFn(analyzeSong);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Pick a WAV or MP3 file first.");
    if (file.size > MAX_BYTES) return toast.error("File too large (max 50 MB).");
    if (!title.trim()) return toast.error("Give the track a title.");

    setBusy(true);
    try {
      setStage("Authenticating session...");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");

      setStage("Analyzing audio in-browser (LUFS, FFT, stereo)...");
      const metrics = await analyzeAudioFile(file, (s) => setStage(s));

      setStage("Uploading to private storage...");
      const ext = file.name.split(".").pop() || "wav";
      const path = `${auth.user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("songs").upload(path, file, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });
      if (upErr) throw upErr;

      setStage("Registering track...");
      const { data: song, error: insErr } = await supabase
        .from("songs")
        .insert({
          user_id: auth.user.id,
          title: title.trim(),
          artist: artist.trim() || null,
          genre: genre.trim() || null,
          notes: notes.trim() || null,
          storage_path: path,
          file_size: file.size,
          duration_seconds: metrics.durationSec,
          sample_rate: metrics.sampleRate,
          channels: metrics.channels,
          status: "analyzing",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      setStage("Generating expert review...");
      await runAnalyze({ data: { song_id: song.id, metrics } });

      toast.success("Analysis complete.");
      navigate({ to: "/songs/$id", params: { id: song.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Upload a track</h1>
        <p className="mt-1 text-sm text-muted-foreground">WAV or MP3, up to 50 MB. Stays private to your account.</p>

        <form onSubmit={submit} className="mt-8 panel p-6 md:p-8 space-y-5">
          <label className="block">
            <input
              type="file"
              accept="audio/wav,audio/mpeg,audio/mp3,.wav,.mp3"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="hidden"
              id="file"
              disabled={busy}
            />
            <div className="rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors p-8 text-center cursor-pointer">
              <UploadCloud className="size-8 mx-auto text-primary" />
              <div className="mt-3 font-medium">{file ? file.name : "Drop or click to select a file"}</div>
              <div className="mt-1 text-xs text-muted-foreground mono">
                {file ? `${(file.size / 1_000_000).toFixed(2)} MB · ${file.type || "audio"}` : "WAV / MP3 · 50 MB max"}
              </div>
              <Button type="button" variant="secondary" className="mt-4" onClick={() => document.getElementById("file")?.click()} disabled={busy}>
                Choose file
              </Button>
            </div>
          </label>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className="mt-1.5" disabled={busy} />
            </div>
            <div>
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} className="mt-1.5" disabled={busy} />
            </div>
          </div>
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g. House, Hip-Hop, Indie Rock" maxLength={60} className="mt-1.5" disabled={busy} />
          </div>
          <div>
            <Label htmlFor="notes">Producer notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} placeholder="What are you unsure about? What should the reviewer focus on?" className="mt-1.5" disabled={busy} />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? (<><Loader2 className="size-4 mr-2 animate-spin" /> {stage || "Working..."}</>) : "Analyze track"}
          </Button>
        </form>
      </main>
    </div>
  );
}
