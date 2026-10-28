export type PublicSupabaseConfig =
  | { configured: false }
  | { configured: true; url: string; key: string; projectRef: string | null };

// These values are bundled into public browser code. Reject privileged keys
// before either Vite or the application can use them. Errors never echo values.
export function publicSupabaseConfig(
  urlValue: string | undefined,
  keyValue: string | undefined,
): PublicSupabaseConfig {
  const urlText = urlValue?.trim() || "";
  const key = keyValue?.trim() || "";
  if (!urlText && !key) return { configured: false };
  if (!urlText || !key)
    throw new Error(
      "Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave both empty for the demonstration.",
    );
  let url: URL;
  try {
    url = new URL(urlText);
  } catch {
    throw new Error(
      "VITE_SUPABASE_URL must be the project API URL, not a dashboard link or database connection string.",
    );
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(local && url.protocol === "http:"))
  )
    throw new Error(
      "Use the HTTPS project API origin only (HTTP is allowed for local development). Do not include passwords, paths or query strings.",
    );
  if (key.startsWith("sb_secret_") || key.startsWith("sbp_"))
    throw new Error(
      "A privileged secret/management key cannot be used in VITE_SUPABASE_ANON_KEY. Use the publishable or legacy anon key.",
    );
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    let role: unknown;
    try {
      const parts = key.split(".");
      if (parts.length !== 3) throw new Error();
      role = JSON.parse(
        atob(parts[1].replaceAll("-", "+").replaceAll("_", "/")),
      ).role;
    } catch {
      throw new Error(
        "VITE_SUPABASE_ANON_KEY must be a publishable key (sb_publishable_...) or a legacy anon JWT.",
      );
    }
    if (role !== "anon")
      throw new Error(
        "Only the legacy anon role is allowed in public client configuration. Never use service_role or a signed-in user's token.",
      );
  }
  return {
    configured: true,
    url: url.origin,
    key,
    projectRef: /^([a-z]{20})\.supabase\.co$/.exec(url.hostname)?.[1] || null,
  };
}
