import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const text = await fs.readFile(path.join(process.cwd(), ".env.local"), "utf8");
for (const line of text.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  const v = t.slice(i + 1).trim().split(/\s+#/)[0].trim();
  if (!process.env[k]) process.env[k] = v;
}
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PAGE_ID = "61f1ef5e-349d-4162-9b1f-42050828401b";
const IMG_WORKSHOP = "80000000-0000-4000-8000-000000000018";
const IMG_CIRCLE_IN = "80000000-0000-4000-8000-000000000019";
const IMG_CIRCLE_OUT = "80000000-0000-4000-8000-00000000001a";
const mode = process.argv[2];

// Placed with fractional sort_order so they land in sensible spots inside
// the page's existing 1..11 order rather than all at the end.
const blocks = [
  // After requirements (7) — "what you'll receive".
  {
    block_type: "certificates",
    sort_order: 7.3,
    data: {
      heading: "התעודות שתקבלו בלימודי פסיכותרפיה",
      intro:
        "תעודת גמר מטעם מכללת טריותרפיה והמכון העולמי, פסיכותרפיה ממוקדת התמכרויות — התמכרויות, טראומה, ומערכות יחסים.",
      items: [
        { media_id: IMG_WORKSHOP, caption: null },
        { media_id: IMG_CIRCLE_IN, caption: "תעודת הסמכה" },
      ],
    },
  },
  // Right after the certificates — the natural "and here are the details".
  {
    block_type: "syllabus_download",
    sort_order: 7.6,
    data: {
      heading: "רוצים לראות את התוכנית המלאה?",
      body: "הסילבוס המלא של שנה א׳ כולל פירוט כל המפגשים, הנושאים והקריאה הנלווית.",
      file_url: "https://drive.google.com/file/d/EXAMPLE_REPLACE_ME/view",
      button_label: "סילבוס להורדה",
      open_in_new_tab: true,
    },
  },
  // After the FAQ (9) — reading material as a closing resource.
  {
    block_type: "reading_list",
    sort_order: 9.3,
    data: {
      heading: "ספרי ליבה לשנה א׳",
      intro:
        "רשימת הקריאה המלווה את השנה הראשונה. הספרים אינם חובה, אך מעמיקים משמעותית את החומר הנלמד במפגשים.",
      items: [
        {
          title: "No Bad Parts — ריצ׳רד שוורץ",
          cover_media_id: IMG_WORKSHOP,
          description:
            "ספר היסוד של מודל IFS מאת מפתח השיטה. מציג את הרעיון שאין חלקים רעים בנפש — רק חלקים שנשאו תפקיד קשה מדי, זמן רב מדי.",
          link: null,
        },
        {
          title: "התיאוריה הפוליווגאלית — סטיבן פורג׳ס",
          cover_media_id: IMG_CIRCLE_IN,
          description:
            "בסיס להבנת מערכת העצבים האוטונומית ותחושת הביטחון בגוף. חומר מרכזי בסמסטר הראשון.",
          link: null,
        },
        {
          title: "הגוף זוכר — בסל ואן דר קולק",
          cover_media_id: IMG_CIRCLE_OUT,
          description:
            "כיצד טראומה נחקקת בגוף ולא רק בזיכרון, ומה המשמעות של זה לעבודה טיפולית חווייתית.",
          link: null,
        },
      ],
    },
  },
  // Just before the closing CTA (10) — "where to next".
  {
    block_type: "link_cards",
    sort_order: 9.6,
    data: {
      heading: "שלוש שנות המסלול",
      intro: "כל שנה בונה על קודמתה. בחרו שנה לפרטים המלאים.",
      cards: [
        {
          title: "שנה א׳ — יסודות",
          body: "מוח ומערכת העצבים, התקשרות, רגש והגנות, ומבוא למודל IFS.",
          image_media_id: IMG_WORKSHOP,
          link: { label: "לשנה א׳", href: "/shana-aa", open_in_new_tab: false },
        },
        {
          title: "שנה ב׳ — העמקה",
          body: "עבודה עם טראומה, דפוסי התקשרות ומערכות יחסים, ותרגול מונחה.",
          image_media_id: IMG_CIRCLE_IN,
          link: { label: "לשנה ב׳", href: "/shana-b", open_in_new_tab: false },
        },
        {
          title: "שנה ג׳ — התמקצעות",
          body: "עבודה טיפולית עצמאית בליווי הדרכה, אתיקה מקצועית ואינטגרציה.",
          image_media_id: IMG_CIRCLE_OUT,
          link: { label: "לשנה ג׳", href: "/shana-g", open_in_new_tab: false },
        },
      ],
    },
  },
];

if (mode === "add") {
  const rows = blocks.map((b) => ({ page_id: PAGE_ID, training_id: null, is_visible: true, ...b }));
  const { data, error } = await s.from("page_blocks").insert(rows).select("block_type, sort_order");
  if (error) {
    console.error("FAILED:", error);
    process.exit(1);
  }
  console.log(`inserted ${data.length}:`);
  for (const r of data.sort((a, b) => a.sort_order - b.sort_order)) {
    console.log(`  ${r.sort_order}  ${r.block_type}`);
  }
} else if (mode === "revert") {
  const types = blocks.map((b) => b.block_type);
  const { error } = await s.from("page_blocks").delete().eq("page_id", PAGE_ID).in("block_type", types);
  console.log(error ? "FAIL: " + error.message : "reverted");
}
