import { readFile } from "node:fs/promises";

// Updates email content only. Never changes SMTP credentials, signup or verification.
// Use Node's --use-env-proxy so scoped network-secret bindings stay on their route.
try {
  const ref = /^https:\/\/([a-z]{20})\.supabase\.co\/?$/.exec(
    process.env.VITE_SUPABASE_URL || "",
  )?.[1];
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!ref || !token)
    throw new Error(
      "A hosted VITE_SUPABASE_URL and SUPABASE_ACCESS_TOKEN binding are required.",
    );
  const expected = {
    mailer_subjects_confirmation: "Confirm your email to join BBFind",
    mailer_subjects_recovery: "Reset your BBFind password",
    mailer_templates_confirmation_content: await readFile(
      new URL("../supabase/templates/confirmation.html", import.meta.url),
      "utf8",
    ),
    mailer_templates_recovery_content: await readFile(
      new URL("../supabase/templates/recovery.html", import.meta.url),
      "utf8",
    ),
  };
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (process.argv.includes("--apply")) {
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers,
      body: JSON.stringify(expected),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(
        `Email template update failed (HTTP ${response.status}).`,
      );
    // Auth responses can contain credentials. Do not print or save the body.
    await response.body?.cancel();
  }
  const response = await fetch(endpoint, {
    headers,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Email template check failed (HTTP ${response.status}).`);
  const current = await response.json();
  const matches = Object.entries(expected).every(
    ([key, value]) => current[key] === value,
  );
  if (!matches)
    throw new Error(
      "Hosted email templates differ from the repository. Use --apply to update them.",
    );
  console.log(
    "Hosted confirmation and password-reset templates match the repository.",
  );
  console.log(
    "No email sent. SMTP, signup and verification settings were not changed.",
  );
} catch (error) {
  console.error(
    error instanceof TypeError
      ? "Could not reach the Supabase Management API. Check environment networking."
      : error.message,
  );
  process.exitCode = 1;
}
