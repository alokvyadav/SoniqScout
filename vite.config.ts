import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  // Make non-VITE_ variables from .env (SUPABASE_URL, AI_API_KEY, ...) visible to
  // server functions via process.env during `vite dev`. In production your host's
  // environment variables are used instead.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    server: { port: 3000 },
    plugins: [
      tsconfigPaths(),
      // Redirect TanStack Start's server entry to src/server.ts (SSR error wrapper).
      tanstackStart({ server: { entry: "server" } }),
      nitro(),
      viteReact(),
      tailwindcss(),
    ],
  };
});
