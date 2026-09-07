/**
 * Starts the dev server for the Tamar Reiss site on port 3001.
 *
 * Node's own `--env-file` cannot be used here: `next dev` re-executes
 * itself in a child process and Node refuses `--env-file` inside
 * NODE_OPTIONS, so the flag dies with the parent. Reading the file here
 * and passing the values through `env` reaches the child instead.
 *
 * .env.local still gets read by Next afterwards, but values already present
 * in the environment win, so DATABASE_URL here points at the tamar database
 * and never at the הנני one. The startup banner prints which database is in
 * use so a mix-up is visible immediately rather than after writing data.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const env = { ...process.env };
for (const line of readFileSync(".env.tamar", "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
  if (!m) continue;
  // Explicit value wins over the file, matching how the other scripts behave.
  env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}

const db = env.DATABASE_URL ?? "(unset)";
if (!/:5433\//.test(db)) {
  console.error(`[dev:tamar] refusing to start: DATABASE_URL is not the tamar database (port 5433).
  got: ${db}`);
  process.exit(1);
}
console.log(`[dev:tamar] database ${db.replace(/:[^:@]*@/, ":****@")}`);

// pnpm on this machine is a corepack shim, and corepack's directory is not
// always on PATH for non-interactive shells. Next shells out to bare `pnpm`
// when it thinks the SWC binary is missing, so without this it "repairs" a
// lockfile that is not broken and then dies. Adding the Node install dir
// (which holds corepack/pnpm shims) keeps that path working.
const nodeDir = path.dirname(process.execPath);
const extra = [nodeDir];
// PNPM_SHIM_DIR lets a machine without a real `pnpm` on PATH point at one
// (e.g. a corepack wrapper). Optional: unset it and nothing changes.
if (env.PNPM_SHIM_DIR) extra.unshift(env.PNPM_SHIM_DIR);
env.PATH = [env.PATH ?? "", ...extra].join(path.delimiter);

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", "3001"],
  { stdio: "inherit", env },
);
child.on("exit", (code) => process.exit(code ?? 0));
