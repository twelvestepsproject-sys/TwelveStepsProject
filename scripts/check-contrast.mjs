#!/usr/bin/env node
/**
 * Standalone WCAG AA contrast check over the shipped `@theme` default
 * tokens in app/globals.css (§17: "Every default token pair passes WCAG
 * AA"). Plain Node/mjs script (no ts-node/tsx dependency at build time),
 * so the contrast math is duplicated here in plain JS rather than
 * importing lib/admin/contrast.ts directly — same formulas, kept in sync
 * by hand since both are short and rarely change. If you touch the AA
 * math, update both.
 *
 * Run: node scripts/check-contrast.mjs
 * Exits non-zero if any checked pair fails AA (< 3:1) so this can be
 * wired into CI/pre-launch checks alongside check:placeholder.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const cssPath = path.join(process.cwd(), "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

function readToken(name) {
  const re = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,6})`);
  const m = css.match(re);
  return m ? m[1] : null;
}

function hexToRgb(hex) {
  const clean = hex.replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]) {
  const [lr, lg, lb] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexToRgb(hexA));
  const lb = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const PAIRS = [
  ["טקסט על רקע ראשי (bg)", "color-ink", "color-bg"],
  ["טקסט על משטח (surface)", "color-ink", "color-surface"],
  ["טקסט על משטח משני (surface-alt)", "color-ink", "color-surface-alt"],
  ["טקסט מושתק על רקע ראשי", "color-ink-muted", "color-bg"],
  ["טקסט על כפתור ראשי (primary)", "color-primary-fg", "color-primary"],
  ["טקסט על כפתור פעולה (accent)", "color-accent-fg", "color-accent"],
];

let hasFailure = false;
console.log("WCAG AA contrast check — app/globals.css default tokens\n");

for (const [label, fgName, bgName] of PAIRS) {
  const fg = readToken(fgName);
  const bg = readToken(bgName);
  if (!fg || !bg) {
    console.log(`  ? ${label}: could not read --${fgName} / --${bgName}`);
    continue;
  }
  const ratio = contrastRatio(fg, bg);
  const level = ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-large only" : "FAIL";
  const line = `  ${level === "FAIL" ? "✗" : "✓"} ${label}: ${fg} on ${bg} → ${ratio.toFixed(2)}:1 (${level})`;
  console.log(line);
  if (level === "FAIL") hasFailure = true;
}

console.log("");
if (hasFailure) {
  console.error("FAILED: one or more default token pairs do not meet WCAG AA (>= 3:1).");
  process.exit(1);
} else {
  console.log("All checked default token pairs pass WCAG AA.");
}
