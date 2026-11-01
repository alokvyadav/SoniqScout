import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Upload, Music, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SONIQ" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("id,title,artist,genre,status,created_at, analyses(overall_score)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Your tracks</h1>
            <p className="mt-1 text-sm text-muted-foreground">Every analysis lives here. Private to your account.</p>
          </div>
          <Link to="/upload">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-11">
              <Upload className="size-4 mr-2" /> New analysis
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="panel p-10 text-center text-muted-foreground mono text-sm">Loading session...</div>
        ) : !data || data.length === 0 ? (
          <div className="panel p-16 text-center">
            <Music className="size-10 mx-auto text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No tracks yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Upload your first WAV or MP3 to get a scored review.</p>
            <Link to="/upload"><Button className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">Upload track</Button></Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {data.map((s) => {
              const an = Array.isArray(s.analyses) ? s.analyses[0] : s.analyses;
              const score = an?.overall_score;
              return (
                <Link key={s.id} to="/songs/$id" params={{ id: s.id }} className="panel p-5 flex items-center gap-5 hover:border-primary/40 transition-colors">
                  <div className="size-12 rounded-md bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center text-primary">
                    <Music className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground mono mt-0.5 truncate">
                      {s.artist || "—"} · {s.genre || "Unspecified"} · {new Date(s.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    {score != null ? (
                      <>
                        <div className="text-[10px] text-muted-foreground mono">SCORE</div>
                        <div className="text-2xl font-display font-semibold mono text-primary">{Number(score).toFixed(1)}</div>
                      </>
                    ) : (
                      <span className="text-xs mono text-muted-foreground uppercase">{s.status}</span>
                    )}
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
