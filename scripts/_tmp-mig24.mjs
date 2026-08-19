import fs from "node:fs/promises";
import path from "node:path";
const text = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
for (const line of text.split("\n")) {
  const t=line.trim(); if(!t||t.startsWith("#"))continue;
  const i=t.indexOf("="); if(i===-1)continue;
  const k=t.slice(0,i).trim(); const v=t.slice(i+1).trim().split(/\s+#/)[0].trim();
  if(!process.env[k])process.env[k]=v;
}
const ref = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\./)[1];
const token = process.env.SUPABASE_ACCESS_TOKEN;
async function run(q, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const body = await res.text();
  if (!res.ok) { console.error(`FAILED (${label}):`, res.status, body); process.exit(1); }
  return body;
}
const sql = await fs.readFile("supabase/migrations/00000000000024_shared_blocks.sql","utf8");
await run(sql, "migration 24");
console.log("migration 24 applied");
console.log("table:", await run("select column_name from information_schema.columns where table_name='shared_blocks' order by ordinal_position;","verify"));
console.log("fk col:", await run("select column_name from information_schema.columns where table_name='page_blocks' and column_name='shared_block_id';","verify fk"));
console.log("policies:", await run("select polname from pg_policy where polrelid='public.shared_blocks'::regclass;","verify rls"));
