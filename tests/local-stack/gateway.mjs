import http from "node:http";
const routes = [
  ["/auth/v1", "auth", 9999],
  ["/rest/v1", "rest", 3000],
  ["/storage/v1", "storage", 5000],
  ["/functions/v1/process-image", "processor", 9000],
];
http
  .createServer((req, res) => {
    // The hosted Supabase gateway supplies CORS; mirror it for local browsers.
    const origin = req.headers.origin;
    const allowed = [
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
    ];
    if (origin && !allowed.includes(origin)) {
      res.writeHead(403);
      res.end("Origin denied");
      return;
    }
    const cors = origin
      ? {
          "access-control-allow-origin": origin,
          "access-control-allow-headers":
            "authorization, apikey, x-client-info, x-supabase-api-version, content-type, prefer, range, accept-profile, content-profile, x-upsert",
          "access-control-allow-methods":
            "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS",
          vary: "Origin",
        }
      : {};
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    const route = routes.find(
      ([prefix]) =>
        req.url === prefix ||
        req.url.startsWith(prefix + "/") ||
        req.url.startsWith(prefix + "?"),
    );
    if (!route) {
      res.writeHead(404);
      res.end("Unknown local test endpoint");
      return;
    }
    const [prefix, hostname, port] = route;
    const headers = { ...req.headers, host: `${hostname}:${port}` };
    if (!headers.authorization)
      headers.authorization = `Bearer ${process.env.LOCAL_ANON_KEY}`;
    const upstream = http.request(
      {
        hostname,
        port,
        path: req.url.slice(prefix.length) || "/",
        method: req.method,
        headers,
      },
      (response) => {
        res.writeHead(response.statusCode || 502, {
          ...response.headers,
          ...cors,
        });
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end("Local service unavailable");
    });
    req.pipe(upstream);
  })
  .listen(8000, "0.0.0.0");
