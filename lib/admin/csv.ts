import "server-only";

/**
 * §8 Leads/Messages/Subscribers: "CSV export." Shared CSV-building helper —
 * no CSV export existed anywhere in the project before this task, so this
 * is a fresh, small, dependency-free implementation rather than pulling in
 * a library for one function.
 *
 * Two gotchas this deliberately handles (both explicitly called out in the
 * task brief):
 *  1. Proper escaping for values containing commas, quotes, or newlines —
 *     RFC 4180: wrap the field in double quotes and double any internal
 *     double quote.
 *  2. UTF-8 BOM prefix — without it, Excel (the realistic tool a
 *     non-technical Israeli admin opens a CSV in) guesses the wrong
 *     encoding for Hebrew and renders mojibake instead of the actual text.
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  // \r\n per RFC 4180 — also what Excel expects on Windows, the realistic
  // target here.
  return lines.join("\r\n");
}

const UTF8_BOM = "﻿";

/** Wrap a CSV string with the UTF-8 BOM and return it as a `Response` with
 * the correct headers for a file download. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(UTF8_BOM + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
