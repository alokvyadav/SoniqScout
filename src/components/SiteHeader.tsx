import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Waves } from "lucide-react";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
            <Waves className="size-4" />
          </div>
          <span className="font-display font-semibold tracking-tight text-lg">SONIQ<span className="text-primary">.</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          {email && <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>}
          {email && <Link to="/upload" className="hover:text-foreground transition-colors">Upload</Link>}
        </nav>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden sm:inline text-xs text-muted-foreground mono">{email}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth"><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Get started</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
