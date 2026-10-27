import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
const destination = process.argv[2];
if (!destination)
  throw new Error(
    "Usage: node scripts/backup-storage.mjs /private/backup/directory",
  );
const target = resolve(destination),
  repo = resolve(".");
if (target === repo || target.startsWith(repo + "/"))
  throw new Error("Backups must be outside this repository.");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY securely in the process environment.",
  );
const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  bucket = client.storage.from("directory-images");
await mkdir(target, { recursive: true, mode: 0o700 });
const manifest = [];
async function walk(prefix = "") {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await bucket.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const object of data || []) {
      if (
        !object.name ||
        object.name.includes("/") ||
        object.name === "." ||
        object.name === ".."
      )
        throw new Error("Unexpected object name.");
      const path = prefix ? `${prefix}/${object.name}` : object.name;
      if (!object.id) {
        await walk(path);
        continue;
      }
      const { data: blob, error } = await bucket.download(path);
      if (error) throw error;
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const dir = resolve(target, prefix);
      if (!dir.startsWith(target + "/") && dir !== target)
        throw new Error("Invalid object path");
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(resolve(target, path), buffer, {
        mode: 0o600,
        flag: "wx",
      });
      manifest.push({ path, bytes: buffer.length });
    }
    if (!data || data.length < 100) break;
  }
}
await walk();
await writeFile(
  resolve(target, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { mode: 0o600, flag: "wx" },
);
console.log(
  `Backed up ${manifest.length} storage files. Keep the directory private and encrypt it at rest.`,
);
