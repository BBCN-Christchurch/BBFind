import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { publicSupabaseConfig } from "./src/supabase-config.ts";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  publicSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
  return {
    plugins: [react()],
    base: process.env.VITE_BASE_PATH || "/",
    test: { environment: "jsdom", include: ["src/**/*.test.ts*"] },
  };
});
