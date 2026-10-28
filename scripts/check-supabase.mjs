import { publicSupabaseConfig } from "../src/supabase-config.ts";
// Read-only checks. This script never changes schemas, accounts or auth settings.
try {
  const config = publicSupabaseConfig(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
  );
  if (!config.configured) {
    console.error("Supabase configuration is not available in this process.");
    console.error(
      "Required environment variable names: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
    console.error(
      "If already entered in Codex settings, save the editor and activate/publish the updated environment, then start a task using that version. Do not create duplicate bindings.",
    );
    process.exitCode = 2;
  } else {
    const headers = { apikey: config.key };
    const response = await fetch(
      config.url + "/rest/v1/rpc/directory_search?offset_count=0&page_size=1",
      { headers, signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) {
      console.error(
        response.status === 401 || response.status === 403
          ? "Public API authentication was rejected. Check that the public key belongs to this project."
          : response.status === 404
            ? "Project API reached, but the BBFind database function is missing. Apply the migration using SUPABASE_SETUP.md."
            : `Public directory check failed (HTTP ${response.status}).`,
      );
      process.exitCode = 1;
    } else {
      const rows = await response.json();
      if (!Array.isArray(rows))
        throw new Error("Unexpected directory response.");
      console.log(
        "Public database connection: OK. Approved directory API is available.",
      );
      const settings = await fetch(config.url + "/auth/v1/settings", {
        headers,
        signal: AbortSignal.timeout(15000),
      });
      if (settings.ok) {
        const data = await settings.json();
        console.log(
          "Email verification required:",
          data.mailer_autoconfirm === false
            ? "yes"
            : "check Supabase Authentication settings",
        );
      }
      console.log(
        "Administrative management credential:",
        process.env.SUPABASE_ACCESS_TOKEN
          ? "present (not verified by this public check)"
          : "not configured",
      );
      if (config.projectRef)
        console.log(
          "Project SQL editor:",
          `https://supabase.com/dashboard/project/${config.projectRef}/sql/new`,
        );
      console.log(
        "This read-only check does not establish SMTP delivery, function deployment or production readiness.",
      );
    }
  }
} catch (error) {
  // Network error messages can contain URLs. Keep diagnostics bounded and avoid
  // printing supplied credentials or connection strings.
  console.error(
    error instanceof TypeError
      ? "Could not reach the Supabase API. Check the URL, project status and environment networking."
      : error.message,
  );
  process.exitCode = 1;
}
