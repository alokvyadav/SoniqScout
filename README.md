# SONIQ — AI mixing & mastering reviews

Upload a WAV/MP3 → the browser measures it (LUFS, true peak, dynamics, stereo, FFT spectrum,
tonal balance) → a server function sends those measurements to an LLM → you get scores
(mix, master, arrangement, commercial, technical) and producer notes. Everything is private
per user.

**Stack:** TanStack Start (React 19, Vite) · Tailwind v4 + shadcn/ui · Supabase (Auth, Postgres
with RLS, private Storage bucket) · any OpenAI-compatible LLM API for the review.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the migrations** in `supabase/migrations/` in filename order (SQL Editor → paste & run,
   or `supabase link --project-ref <ref> && supabase db push`). They create the `songs` and
   `analyses` tables, row-level-security policies, the private `songs` storage bucket and its
   per-user folder policies.
3. **Auth settings** (Supabase → Authentication):
   - Email/password works out of the box. For instant sign-in during development, turn off
     "Confirm email" under Providers → Email; otherwise users must click the emailed link.
   - For the "Continue with Google" button, enable the Google provider and add
     `http://localhost:3000/dashboard` (and your production URL) to URL Configuration → Redirect URLs.
4. **Get an AI key.** Any OpenAI-compatible chat-completions API works. `.env.example` is set up
   for Google Gemini; OpenAI/OpenRouter values are noted there. Check your provider's current model names.
5. **Configure env and run:**
   ```bash
   cp .env.example .env     # fill in the values
   npm install
   npm run dev              # http://localhost:3000
   ```

`npm run build` then `npm start` runs the production server (Nitro, Node target).

## How the pieces map

| Concern | Where |
| --- | --- |
| In-browser audio analysis | `src/lib/audio-analyzer.ts` |
| Upload → Storage → DB insert → analyze | `src/routes/_authenticated/upload.tsx` |
| LLM review (server function, auth-checked) | `src/lib/analysis.functions.ts` |
| Auth guard + bearer token to server fns | `src/routes/_authenticated/route.tsx`, `src/integrations/supabase/` |
| Report page (rings, waveform, spectrum) | `src/routes/_authenticated/songs.$id.tsx`, `src/components/audio/` |
| Schema, RLS, bucket | `supabase/migrations/` |

## Security notes

- Never commit `.env`. Only the anon/publishable Supabase key belongs in this app; the
  service-role key is not needed.
- The AI key is server-only (no `VITE_` prefix), so it never reaches the browser.
