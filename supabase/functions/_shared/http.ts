export function cors(req: Request) {
  const origin = req.headers.get("Origin");
  const allowed = (
    Deno.env.get("ALLOWED_ORIGINS") ||
    "http://127.0.0.1:5173,http://localhost:5173"
  )
    .split(",")
    .map((x) => x.trim());
  return {
    "Access-Control-Allow-Origin":
      origin && allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, x-supabase-api-version, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
export function originAllowed(req: Request) {
  const origin = req.headers.get("Origin");
  return (
    !origin ||
    (
      Deno.env.get("ALLOWED_ORIGINS") ||
      "http://127.0.0.1:5173,http://localhost:5173"
    )
      .split(",")
      .map((x) => x.trim())
      .includes(origin)
  );
}
export function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json" },
  });
}
