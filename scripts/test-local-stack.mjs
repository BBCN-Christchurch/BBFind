import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes, createHmac } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const exec = promisify(execFile),
  directory = await mkdtemp(join(tmpdir(), "bbfind-integration-"));
const project = `bbfind-integration-${process.pid}`,
  compose = resolve("tests/local-stack/compose.yml"),
  envFile = join(directory, "stack.env");
const password = randomBytes(24).toString("hex"),
  secret = randomBytes(48).toString("hex");
function jwt(role) {
  const encode = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const content =
    encode({ alg: "HS256", typ: "JWT" }) +
    "." +
    encode({
      role,
      iss: "bbfind-local-test",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
  return (
    content +
    "." +
    createHmac("sha256", secret).update(content).digest("base64url")
  );
}
const anon = jwt("anon"),
  service = jwt("service_role");
await writeFile(
  envFile,
  `LOCAL_DB_PASSWORD=${password}\nLOCAL_JWT_SECRET=${secret}\nLOCAL_ANON_KEY=${anon}\nLOCAL_SERVICE_KEY=${service}\n`,
  { mode: 0o600 },
);
const configFile = join(directory, "config.json");
await writeFile(
  configFile,
  JSON.stringify({
    API_URL: "http://127.0.0.1:55421",
    MAIL_URL: "http://127.0.0.1:55425",
    ANON_KEY: anon,
    SERVICE_ROLE_KEY: service,
  }),
  { mode: 0o600 },
);
function sanitise(value) {
  let text = String(value);
  for (const value of [password, secret, anon, service])
    text = text.replaceAll(value, "[redacted]");
  return text.replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/g, "$1[redacted]@");
}
async function docker(args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "",
      err = "";
    p.stdout.on("data", (v) => (out += v));
    p.stderr.on("data", (v) => (err += v));
    p.on("error", reject);
    p.on("exit", (code) =>
      code === 0
        ? resolve(args[0] === "logs" ? out + err : out)
        : reject(new Error(sanitise(err || out))),
    );
    p.stdin.end(input);
  });
}
async function dc(args) {
  return docker([
    "compose",
    "--project-name",
    project,
    "--env-file",
    envFile,
    "-f",
    compose,
    ...args,
  ]);
}
async function container(name) {
  return (await dc(["ps", "--all", "--quiet", name])).trim();
}
async function sql(input) {
  return docker(
    [
      "exec",
      "-i",
      await container("db"),
      "psql",
      "-X",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    input,
  );
}
async function waitFor(label, check, seconds = 60) {
  for (let i = 0; i < seconds; i++) {
    if (await check().catch(() => false)) {
      console.log(label, "ready");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${label} did not become ready`);
}
let succeeded = false;
try {
  console.log(
    "Starting disposable standard PostgreSQL + real Supabase Auth, REST, Storage and Edge services.",
  );
  await dc(["up", "-d", "db", "mail"]);
  await waitFor("PostgreSQL", async () => {
    await docker([
      "exec",
      await container("db"),
      "pg_isready",
      "-U",
      "postgres",
    ]);
    return true;
  });
  const bootstrap = (
    await readFile("tests/local-stack/bootstrap.sql", "utf8")
  ).replaceAll(":'local_password'", `'${password}'`);
  await sql(bootstrap);
  await dc(["up", "-d", "auth", "rest", "storage"]);
  await dc(["create", "gateway", "processor"]);
  await docker([
    "cp",
    resolve("tests/local-stack/gateway.mjs"),
    `${await container("gateway")}:/tmp/gateway.mjs`,
  ]);
  await docker([
    "cp",
    resolve("supabase/functions"),
    `${await container("processor")}:/tmp/functions`,
  ]);
  // Supply verified npm dependencies locally; test containers need no registry DNS.
  const vendor = join(directory, "vendor");
  await mkdir(vendor);
  await writeFile(
    join(vendor, "package.json"),
    JSON.stringify({
      private: true,
      dependencies: {
        "@supabase/supabase-js": "2.118.0",
        "fast-png": "8.0.0",
        "jpeg-js": "0.4.4",
      },
    }),
  );
  await exec("npm", [
    "install",
    "--prefix",
    vendor,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache",
    join(directory, "npm-cache"),
  ]);
  await docker([
    "cp",
    join(vendor, "node_modules"),
    `${await container("processor")}:/tmp/functions/node_modules`,
  ]);
  await docker([
    "cp",
    join(vendor, "package.json"),
    `${await container("processor")}:/tmp/functions/package.json`,
  ]);
  const denoConfig = JSON.parse(
    await readFile("supabase/functions/deno.json", "utf8"),
  );
  denoConfig.nodeModulesDir = "manual";
  const denoFile = join(directory, "deno.json");
  await writeFile(denoFile, JSON.stringify(denoConfig));
  await docker([
    "cp",
    denoFile,
    `${await container("processor")}:/tmp/functions/deno.json`,
  ]);
  await docker([
    "cp",
    "/etc/ssl/certs/ca-certificates.crt",
    `${await container("processor")}:/tmp/root-certificates.pem`,
  ]);
  await dc(["start", "gateway"]);
  await waitFor("Supabase Auth", async () => {
    const r = await fetch("http://127.0.0.1:55421/auth/v1/health", {
      signal: AbortSignal.timeout(1500),
    });
    return r.ok;
  });
  await waitFor("Storage migrations", async () => {
    const result = await sql(
      "select to_regclass('storage.objects') is not null and to_regclass('auth.users') is not null as ready;",
    );
    return result.includes("t");
  });
  await sql(await readFile("tests/local-stack/claims.sql", "utf8"));
  await sql(
    await readFile("supabase/migrations/202610270001_directory.sql", "utf8"),
  );
  await sql(
    "grant usage on schema storage to anon,authenticated,service_role; grant all on all tables in schema storage to anon,authenticated,service_role; grant usage,select on all sequences in schema storage to anon,authenticated,service_role; notify pgrst, 'reload schema';",
  );
  await dc(["start", "processor"]);
  await waitFor(
    "Image function",
    async () => {
      const r = await fetch(
        "http://127.0.0.1:55421/functions/v1/process-image",
        { method: "POST", signal: AbortSignal.timeout(1500) },
      );
      return r.status === 401;
    },
    90,
  );
  await exec(process.execPath, ["scripts/check-supabase.mjs"], {
    env: {
      ...process.env,
      VITE_SUPABASE_URL: "http://127.0.0.1:55421",
      VITE_SUPABASE_ANON_KEY: anon,
    },
  });
  console.log(
    "Read-only Supabase setup checker passed against the local service API.",
  );
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["scripts/test-backend.mjs"], {
      stdio: "inherit",
      env: { ...process.env, BBFIND_LOCAL_CONFIG: configFile },
    });
    p.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Backend tests exited ${code}`)),
    );
    p.on("error", reject);
  });
  succeeded = true;
} catch (error) {
  console.error(sanitise(error.message));
  for (const name of ["db", "auth", "storage", "processor"]) {
    try {
      const log = await docker(["logs", "--tail", "12", await container(name)]);
      if (log.trim()) console.error(`Diagnostic (${name}):\n${sanitise(log)}`);
    } catch {}
  }
  process.exitCode = 1;
} finally {
  try {
    await dc(["down", "--volumes", "--remove-orphans"]);
  } catch (error) {
    console.error("Local stack cleanup:", sanitise(error.message));
    process.exitCode = 1;
  }
  await rm(directory, { recursive: true, force: true });
}
if (succeeded)
  console.log(
    "Local integration stack validated and removed. No hosted project was changed.",
  );
