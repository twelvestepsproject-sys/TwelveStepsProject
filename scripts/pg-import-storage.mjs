// Downloads every file from Supabase Storage to the local filesystem.
//
// The `media` table stores only a path, so migrating the database without
// the files leaves every image on the site broken. This closes that gap.
//
// Files land in `storage/media/<storage_path>`, preserving the path already
// recorded in the database — so no row needs rewriting, and lib/media.ts
// resolves them by the same key it always used.
//
// Usage: node scripts/pg-import-storage.mjs

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

const ROOT = path.join(process.cwd(), "storage", "media");
const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let ok = 0;
let missing = 0;
const missingPaths = [];

try {
  const { rows } = await client.query("select storage_path from media order by storage_path");
  console.log(`${rows.length} media rows to fetch\n`);

  for (const { storage_path } of rows) {
    const dest = path.join(ROOT, storage_path);
    // A previous partial run should not re-download everything.
    try {
      await fs.access(dest);
      ok += 1;
      continue;
    } catch {
      /* not cached yet */
    }

    const res = await fetch(`${base}/${storage_path}`);
    if (!res.ok) {
      // Expected for the seed rows that always pointed at a path never
      // uploaded — recorded rather than treated as a failure.
      missing += 1;
      missingPaths.push(storage_path);
      continue;
    }

    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok += 1;
  }

  console.log(`downloaded/present : ${ok}`);
  console.log(`missing at source  : ${missing}`);
  if (missingPaths.length) {
    console.log("\nThese media rows point at files that do not exist in Supabase");
    console.log("Storage. They are already broken on the live site today:");
    for (const p of missingPaths) console.log(`  ${p}`);
  }
} finally {
  await client.end();
}
