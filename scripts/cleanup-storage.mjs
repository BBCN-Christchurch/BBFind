import { createClient } from "@supabase/supabase-js";
const apply = process.argv.includes("--apply");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Configure server-only credentials securely.");
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const references = new Set();
for (let offset = 0; ; offset += 200) {
  const { data, error } = await client
    .from("listing_images")
    .select("thumbnail_path,detail_path,large_path")
    .range(offset, offset + 199);
  if (error) throw error;
  for (const row of data || [])
    Object.values(row).forEach((path) => references.add(path));
  if (!data || data.length < 200) break;
}
const bucket = client.storage.from("directory-images");
let candidates = 0;
async function walk(prefix = "") {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    // Dry-run traversal first; deletions are applied only after discovery completes.
    for (const o of data || []) {
      const path = prefix ? `${prefix}/${o.name}` : o.name;
      if (!o.id) await walk(path);
      else if (
        !references.has(path) &&
        o.created_at &&
        Date.now() - new Date(o.created_at).getTime() > 86400000
      )
        removals.push(path);
    }
    if (!data || data.length < 100) break;
  }
}
const removals = [];
await walk();
candidates = removals.length;
if (apply) {
  for (let i = 0; i < removals.length; i += 100) {
    const { error } = await bucket.remove(removals.slice(i, i + 100));
    if (error) throw error;
  }
}
console.log(
  `${apply ? "Removed" : "Would remove"} ${candidates} unreferenced files older than 24 hours. ${apply ? "" : "Run with --apply after reviewing your backup and ensuring no imports are running."}`,
);
