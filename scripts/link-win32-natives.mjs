/**
 * Links the Windows native binaries that pnpm left unlinked in node_modules.
 *
 * This repo's node_modules was installed for Linux (the Docker image), so the
 * win32 packages sit in the pnpm store without a top-level link. Node resolves
 * them fine from inside the store, but Turbopack compiles CSS through
 * node_modules/<pkg>, which has no link — so a cold compile fails with
 * "Cannot find native binding" for tailwind's oxide, lightningcss, and swc.
 *
 * Idempotent: it only creates what is missing, and never touches a real
 * directory that already exists. Reinstalling dependencies on Windows makes
 * it unnecessary; this keeps a Linux-installed tree usable meanwhile.
 */
import { existsSync, mkdirSync, readdirSync, symlinkSync, copyFileSync } from "node:fs";
import path from "node:path";

const PNPM = "node_modules/.pnpm";
const linked = [];

for (const entry of readdirSync(PNPM)) {
  if (!/win32/i.test(entry)) continue;
  // "@tailwindcss+oxide-win32-x64-msvc@4.3.2" -> "@tailwindcss/oxide-win32-x64-msvc"
  const name = entry.slice(0, entry.lastIndexOf("@")).replace("+", "/");
  const src = path.resolve(PNPM, entry, "node_modules", name);
  const dst = path.resolve("node_modules", name);
  if (!existsSync(src) || existsSync(dst)) continue;

  mkdirSync(path.dirname(dst), { recursive: true });
  symlinkSync(src, dst, "junction");
  linked.push(name);

  // Some loaders fall back to requiring the .node file from the *parent*
  // package's root rather than the platform package, so place a copy there.
  const parent = name.replace(/-win32-x64(-msvc)?$/, "");
  const parentDir = path.resolve("node_modules", parent);
  if (!existsSync(parentDir)) continue;
  for (const f of readdirSync(src)) {
    if (!f.endsWith(".node")) continue;
    const target = path.join(parentDir, f);
    if (!existsSync(target)) copyFileSync(path.join(src, f), target);
  }
}

// pnpm isolates each package: a store copy resolves its own dependencies from
// its private node_modules, not the top level. lightningcss ships with its
// platform sibling linked there, tailwind's oxide does not — so link the
// platform package beside every store copy that needs it too.
const storeLinked = [];
for (const entry of readdirSync(PNPM)) {
  if (!/win32/i.test(entry)) continue;
  const name = entry.slice(0, entry.lastIndexOf("@")).replace("+", "/");
  const src = path.resolve(PNPM, entry, "node_modules", name);
  if (!existsSync(src)) continue;
  const base = name.replace(/-win32-x64(-msvc)?$/, "");

  for (const other of readdirSync(PNPM)) {
    if (!other.startsWith(base.replace("/", "+") + "@")) continue;
    const dst = path.resolve(PNPM, other, "node_modules", name);
    if (existsSync(dst)) continue;
    mkdirSync(path.dirname(dst), { recursive: true });
    symlinkSync(src, dst, "junction");
    storeLinked.push(`${other} -> ${name}`);
  }
}

console.log(linked.length ? `linked: ${linked.join(", ")}` : "nothing to link at top level");
if (storeLinked.length) console.log(`store links: ${storeLinked.join(", ")}`);
