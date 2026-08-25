// Blocks until Postgres is accepting connections.
//
// `docker compose up -d` returns as soon as the container starts, which is
// before the database is ready. Running migrations immediately after fails
// with a connection error that looks like a configuration problem but is
// just a race.

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = await fs.readFile(path.join(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i === -1) continue;
        const k = t.slice(0, i).trim();
        const v = t.slice(i + 1).trim().split(/\s+#/)[0].trim();
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      /* optional */
    }
  }
}

await loadEnv();

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/twelvesteps";

const deadline = Date.now() + 60_000;
process.stdout.write("waiting for postgres");

while (Date.now() < deadline) {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    console.log(" — ready");
    process.exit(0);
  } catch {
    await client.end().catch(() => {});
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.error("\npostgres did not become ready within 60s.");
console.error("Check `docker compose ps` and `docker compose logs postgres`.");
process.exit(1);
