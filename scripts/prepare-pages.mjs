import { readFile, writeFile, mkdir } from "node:fs/promises";
const rawBase = process.env.VITE_BASE_PATH || "/";
const base =
  "/" +
  rawBase.split("/").filter(Boolean).join("/") +
  (rawBase === "/" ? "" : "/");
const site = process.env.VITE_SITE_URL?.replace(/\/$/, "");
const index = await readFile("dist/index.html", "utf8");
const fallback = `<!doctype html><html lang="en"><meta charset="utf-8"><title>BBFind</title><script>const base=${JSON.stringify(base)};const path=location.pathname.startsWith(base)?location.pathname.slice(base.length-1):'/';location.replace(base+'?route='+encodeURIComponent(path+location.search+location.hash));</script><noscript>Return to the directory homepage.</noscript></html>`;
await writeFile("dist/404.html", fallback);
await writeFile("dist/.nojekyll", "");
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: ${base}account\nDisallow: ${base}dashboard\nDisallow: ${base}admin\nDisallow: ${base}reset\n${site ? "Sitemap: " + site + "/sitemap.xml\n" : ""}`,
);
if (site) {
  const u = new URL(site);
  if (!["https:", "http:"].includes(u.protocol))
    throw new Error("VITE_SITE_URL must be HTTP(S).");
  const escape = (s) =>
    s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const routes = ["", "find", "venues", "get-found", "about"];
  const url = process.env.VITE_SUPABASE_URL,
    key = process.env.VITE_SUPABASE_ANON_KEY;
  const listings = [];
  if (url && key) {
    for (let offset = 0; ; offset += 200) {
      const res = await fetch(`${url}/rest/v1/rpc/directory_search`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ offset_count: offset, page_size: 200 }),
      });
      if (!res.ok)
        throw new Error(`Public listing export failed: ${res.status}`);
      const batch = await res.json();
      listings.push(...batch);
      if (batch.length < 200) break;
    }
  }
  for (const row of listings) {
    const route = `listing/${row.id}`;
    routes.push(route);
    const title = `${row.data.name} — BBFind`,
      description = row.data.summary,
      canonical = `${site}/${route}`;
    const html = index
      .replace(/<title>[^<]*<\/title>/, `<title>${escape(title)}</title>`)
      .replace(
        /<meta name="description"[^>]*\/>/,
        `<meta name="description" content="${escape(description)}"/>`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${escape(canonical)}"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:type" content="website"/></head>`,
      );
    await mkdir(`dist/${route}`, { recursive: true });
    await writeFile(`dist/${route}/index.html`, html);
  }
  await writeFile(
    "dist/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${escape(site + "/" + route)}</loc></url>`).join("")}</urlset>`,
  );
  await writeFile(
    "dist/index.html",
    index.replace(
      "</head>",
      `<link rel="canonical" href="${escape(site + "/")}"/><meta property="og:title" content="BBFind — Your community, connected."/><meta property="og:type" content="website"/><meta property="og:url" content="${escape(site + "/")}"/></head>`,
    ),
  );
}
console.log("Prepared Pages fallback, robots and configured public SEO files.");
