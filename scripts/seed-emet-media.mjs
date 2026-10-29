/**
 * Registers the homepage images in the media table.
 *
 * The files were downloaded from the live site and re-encoded to WebP
 * (849 KB -> 322 KB). They live in STORAGE_DIR/uploads like any upload, so
 * the admin can replace any of them later without a deploy.
 *
 * Alt text is written from what each image actually shows, not from the
 * filename: "pexels-photo-105254" tells a screen reader nothing. The
 * chapter covers are stock photography the original site chose, so the
 * descriptions stay literal rather than interpreting them.
 *
 *   node --env-file=.env.emet scripts/seed-emet-media.mjs
 */
import pg from "pg";
import { statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "";
if (!/:5435\//.test(url)) {
  console.error(`refusing to run: DATABASE_URL is not the emet database (port 5435).\n  got: ${url}`);
  process.exit(1);
}

const STORAGE = process.env.STORAGE_DIR ?? "./.storage-emet";

/** Each file with the alt text that describes it. */
const MEDIA = [
  ["hero-bg.webp", "רקע קוד ירוק זוהר על רקע כהה"],
  ["author-portrait.webp", "רוני אילון הירש"],
];

/** The seventeen chapter covers, in chapter order, with alt text that
 *  describes the photograph rather than repeating the chapter title —
 *  the title is already read out as the link text beside it. */
const COVERS = [
  [1,  "יד מחזיקה טלפון מול נוף"],
  [2,  "מחשב נייד ועיניים"],
  [3,  "משקפיים על שולחן עבודה"],
  [4,  "רחוב עירוני בלילה"],
  [5,  "אצבע נוגעת במנורה דולקת"],
  [6,  "פנים בתאורה חלקית"],
  [7,  "קוד ירוק על רקע כהה"],
  [8,  "דיוקן על רקע לבנים"],
  [9,  "ילד מביט הצידה"],
  [10, "יד מושיטה לב אדום"],
  [11, "כלי נשק עתיק"],
  [12, "תפוח אדום על רקע כהה"],
  [13, "דמות בצללית בפתח מואר"],
  [14, "כדור הארץ ולהבות"],
  [15, "חיילים ומסוק בשדה"],
  [16, "מסך מחשב בחדר חשוך"],
  [17, "סליל דנא"],
].map(([n, alt]) => [`chapter-${n}-cover.webp`, alt]);

MEDIA.push(...COVERS);

function dimensions(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
     "-of", "csv=p=0:s=x", file],
    { encoding: "utf8" },
  ).trim();
  const [w, h] = out.split("x");
  return { width: parseInt(w, 10), height: parseInt(h, 10) };
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  let created = 0;
  let updated = 0;

  for (const [file, alt] of MEDIA) {
    const onDisk = path.join(STORAGE, "uploads", file);
    if (!existsSync(onDisk)) {
      console.warn(`  ! missing on disk, skipped: ${file}`);
      continue;
    }
    const storagePath = `uploads/${file}`;
    const { width, height } = dimensions(onDisk);
    const size = statSync(onDisk).size;

    const existing = await client.query(
      `select id from public.media where storage_path = $1`, [storagePath],
    );
    if (existing.rows.length) {
      await client.query(
        `update public.media
            set alt_he = $2, width = $3, height = $4, mime_type = 'image/webp',
                size_bytes = $5, updated_at = now()
          where id = $1`,
        [existing.rows[0].id, alt, width, height, size],
      );
      updated++;
    } else {
      await client.query(
        `insert into public.media (storage_path, alt_he, width, height, mime_type, size_bytes)
         values ($1, $2, $3, $4, 'image/webp', $5)`,
        [storagePath, alt, width, height, size],
      );
      created++;
    }
    console.log(`  ${file.padEnd(22)} ${width}x${height}  ${(size / 1024).toFixed(1)} KB`);
  }

  console.log(`\n${created} created, ${updated} updated.`);
} catch (err) {
  console.error(`failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
