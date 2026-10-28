import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  testMatch: "*.spec.ts",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5183",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : undefined,
  },
  webServer: [
    {
      command: "npm run dev -- --port 5183 --strictPort",
      url: "http://127.0.0.1:5183",
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: "",
        VITE_SUPABASE_ANON_KEY: "",
        VITE_ENABLE_ACCOUNTS: "false",
        VITE_ACCOUNT_PORTAL_URL: "",
        VITE_BASE_PATH: "/",
        VITE_SITE_URL: "",
      },
    },
    {
      command: "npm run dev -- --port 5184 --strictPort",
      url: "http://127.0.0.1:5184",
      reuseExistingServer: false,
      env: {
        VITE_SUPABASE_URL: "http://127.0.0.1:54321",
        VITE_SUPABASE_ANON_KEY: "sb_publishable_local_ui_test_placeholder",
        VITE_ENABLE_ACCOUNTS: "true",
        VITE_ACCOUNT_PORTAL_URL: "",
        VITE_BASE_PATH: "/",
        VITE_SITE_URL: "",
      },
    },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
