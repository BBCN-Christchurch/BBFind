import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// The demo branch must not inherit production service bindings from its host.
const root = fileURLToPath(new URL("..", import.meta.url));
const env = {
  ...process.env,
  VITE_SUPABASE_URL: "",
  VITE_SUPABASE_ANON_KEY: "",
  VITE_ENABLE_ACCOUNTS: "false",
  VITE_ACCOUNT_PORTAL_URL: "",
  VITE_SITE_URL: "",
  VITE_BASE_PATH: "/",
};
delete env.SUPABASE_ACCESS_TOKEN;
delete env.RESEND_API_KEY;
function run(script, args = []) {
  const result = spawnSync(process.execPath, [resolve(root, script), ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const [command, ...args] = process.argv.slice(2);
if (command === "build") {
  run("node_modules/typescript/bin/tsc", ["-b"]);
  run("node_modules/vite/bin/vite.js", ["build", ...args]);
  run("scripts/prepare-pages.mjs");
} else if (command === "dev") {
  run("node_modules/vite/bin/vite.js", ["--host", "0.0.0.0", ...args]);
} else {
  throw new Error("Use demo.mjs build or demo.mjs dev.");
}
