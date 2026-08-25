// One command to get a working local stack: `pnpm setup:local`
//
// Starts Postgres, waits for it, applies the schema, and imports content
// and media. Every step is idempotent, so re-running is safe and will
// simply skip whatever is already done.
//
// The import steps need Supabase credentials in .env.local to copy the
// existing content across. Without them the schema is still created and the
// script says so rather than failing silently.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: true });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function hasSupabaseCreds() {
  try {
    const text = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
    return (
      text.includes("NEXT_PUBLIC_SUPABASE_URL=") && text.includes("SUPABASE_SERVICE_ROLE_KEY=")
    );
  } catch {
    return false;
  }
}

async function ensureEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  let text = "";
  try {
    text = await fs.readFile(envPath, "utf8");
  } catch {
    /* first run */
  }

  const additions = [];
  if (!text.includes("DATABASE_URL=")) {
    additions.push("DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/twelvesteps");
  }
  if (!/^DATA_SOURCE=/m.test(text)) {
    additions.push("DATA_SOURCE=postgres");
  }

  if (additions.length) {
    await fs.writeFile(
      envPath,
      `${text.trimEnd()}\n\n# --- added by scripts/setup-local.mjs ---\n${additions.join("\n")}\n`,
    );
    console.log(`  added to .env.local: ${additions.map((a) => a.split("=")[0]).join(", ")}`);
  }
}

console.log("\n1/5  checking .env.local");
await ensureEnv();

console.log("\n2/5  starting postgres");
if ((await run("docker", ["compose", "up", "-d"])) !== 0) {
  console.error("\nCould not start the database. Is Docker running?");
  process.exit(1);
}

console.log("\n3/5  waiting for postgres");
if ((await run("node", ["scripts/wait-for-db.mjs"])) !== 0) process.exit(1);

console.log("\n4/5  applying schema");
if ((await run("node", ["scripts/pg-migrate.mjs"])) !== 0) process.exit(1);

console.log("\n5/5  importing content");
if (await hasSupabaseCreds()) {
  await run("node", ["scripts/pg-import-content.mjs"]);
  await run("node", ["scripts/pg-import-storage.mjs"]);
} else {
  console.log("  skipped — no Supabase credentials in .env.local.");
  console.log("  The schema is ready; the database is empty.");
}

console.log("\nDone. Start the site with:  pnpm dev\n");
