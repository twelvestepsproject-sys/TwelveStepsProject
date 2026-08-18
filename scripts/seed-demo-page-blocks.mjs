// Seeds the /shana-aa page with one instance of every renderable block
// type, as a live reference for what each block looks like when building a
// new page.
//
// The page already had 10 blocks of real content; this only ADDS the types
// that were missing, interleaved via fractional sort_order so the result
// reads as a real page rather than a catalogue. `page_blocks.sort_order` is
// numeric (migration 14), so fractions are safe.
//
// `header` and `footer` are intentionally absent: they are layout-level and
// render nothing when placed as page blocks (see components/blocks/index.tsx).
//
// CONTENT WARNING: the copy here is written to match the page's real
// subject matter (IFS, polyvagal theory, 12 steps) but is DEMO content, not
// approved marketing copy. Book titles are real works; the descriptions are
// ours. The video_testimonials entries reuse the same YouTube video the
// homepage already embeds — there are no real graduate videos yet.
//
// Usage:
//   node scripts/seed-demo-page-blocks.mjs add      # add the demo blocks
//   node scripts/seed-demo-page-blocks.mjs revert   # remove them again

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
const GALLERY_ID = "90000000-0000-4000-8000-000000000010";
const POSTER_ID = "80000000-0000-4000-8000-000000000017"; // lecture hall photo
const COVER_1 = "80000000-0000-4000-8000-000000000018"; // workshop room
const COVER_2 = "80000000-0000-4000-8000-000000000019"; // circle indoor
const COVER_3 = "80000000-0000-4000-8000-00000000001a"; // circle outdoor
const PORTRAIT_ID = "80000000-0000-4000-8000-000000000001";

// Interleaved into the existing 1..10 using fractional sort_order, so the
// page reads as a real page rather than "existing content, then a dump of
// every remaining block type". page_blocks.sort_order is numeric
// (migration 14), so fractions are safe.
const blocks = [
  // --- after hero (1), before training_details (2) ---
  {
    block_type: "pull_quote",
    sort_order: 1.5,
    data: {
      quote:
        "אנחנו לא מנסים להיפטר מהחלקים שנושאים את הכאב — אנחנו לומדים להקשיב להם, ולגלות שגם הם ניסו כל הזמן להגן עלינו.",
    },
  },
  // --- after about (3) ---
  {
    block_type: "intro_media",
    sort_order: 3.5,
    data: {
      heading: "הצצה אל תוך המפגשים",
      video_url: null,
      thumbnail_media_id: POSTER_ID,
    },
  },
  // --- after focus_areas (4) ---
  {
    block_type: "leader_message",
    sort_order: 4.5,
    data: {
      portrait_media_id: PORTRAIT_ID,
      video_url: null,
      heading: "למה דווקא שנה ראשונה כזו",
      body:
        "כשבנינו את שנה א׳, רצינו שהיא לא תהיה רק שנה של ידע. אפשר ללמוד בעל־פה מהי מערכת עצבים מווסתת, ועדיין לא לזהות את הרגע שבו היא יוצאת מאיזון אצלנו עצמנו.\n\nלכן כל נושא תיאורטי בשנה הזו מגיע יחד עם תרגול חווייתי. לומדים על התקשרות — ואז בודקים מה קורה בגוף כשמישהו מתקרב או מתרחק. לומדים על מגנים — ואז פוגשים את המגן הפרטי שלנו. זו הדרך היחידה שמצאנו להפוך ידע לכלי טיפולי אמיתי.",
      link: { label: "לתוכנית התלת־שנתית", href: "/tochnit-halimudim", open_in_new_tab: false },
    },
  },
  // --- after program_stages (5) ---
  {
    block_type: "reading_list",
    sort_order: 5.5,
    data: {
      heading: "ספרי ליבה לשנה א׳",
      intro:
        "רשימת הקריאה המלווה את השנה הראשונה. הספרים אינם חובה, אך מעמיקים משמעותית את החומר הנלמד במפגשים.",
      items: [
        {
          title: "No Bad Parts — ריצ׳רד שוורץ",
          cover_media_id: COVER_1,
          description:
            "ספר היסוד של מודל IFS מאת מפתח השיטה. מציג את הרעיון שאין חלקים רעים בנפש — רק חלקים שנשאו תפקיד קשה מדי, זמן רב מדי.",
          link: null,
        },
        {
          title: "התיאוריה הפוליווגאלית — סטיבן פורג׳ס",
          cover_media_id: COVER_2,
          description:
            "בסיס להבנת מערכת העצבים האוטונומית ותחושת הביטחון בגוף. חומר מרכזי בסמסטר הראשון.",
          link: null,
        },
        {
          title: "הגוף זוכר — בסל ואן דר קולק",
          cover_media_id: COVER_3,
          description:
            "כיצד טראומה נחקקת בגוף ולא רק בזיכרון, ומה המשמעות של זה לעבודה טיפולית חווייתית.",
          link: null,
        },
        {
          title: "12 הצעדים — טקסט הליבה",
          cover_media_id: null,
          description:
            "הטקסט המקורי של תוכנית 12 הצעדים, המשמש בסיס לשילוב העקרונות לאורך המסלול.",
          link: null,
        },
      ],
    },
  },
  // --- after requirements (6) ---
  {
    block_type: "photo_gallery",
    sort_order: 6.5,
    data: { gallery_id: GALLERY_ID, heading: "רגעים מהמפגשים" },
  },
  // --- after lecturers_grid (7) ---
  {
    block_type: "video_testimonials",
    sort_order: 7.3,
    data: { heading: "בוגרים מספרים", videos: [] },
  },
  {
    block_type: "testimonials_slider",
    sort_order: 7.6,
    data: { heading: "מה אומרים המשתתפים" },
  },
  // --- after faq (8) ---
  {
    block_type: "trainings_carousel",
    sort_order: 8.3,
    data: {
      heading: "מסלולים נוספים במכללה",
      intro: "שנה א׳ היא חלק מהמסלול התלת־שנתי. אלו ההכשרות הנוספות שאנחנו מציעים.",
      featured_only: true,
      all_trainings_link: { label: "לכל ההכשרות", href: "/hachsharot", open_in_new_tab: false },
    },
  },
  {
    block_type: "latest_articles",
    sort_order: 8.5,
    data: {
      heading: "מהבלוג שלנו",
      intro: "כתבות וטקסטים על תהליכי שינוי, עבודה רגשית ופסיכותרפיה חווייתית.",
      all_articles_link: { label: "לכל הכתבות", href: "/blog", open_in_new_tab: false },
    },
  },
  {
    block_type: "podcast",
    sort_order: 8.7,
    data: {
      heading: "הפודקאסט של המכללה",
      platform_cta: {
        label: "להאזנה לכל הפרקים",
        href: "/podcast",
        open_in_new_tab: false,
      },
    },
  },
  // --- after closing_cta (9) ---
  {
    block_type: "community_cta",
    sort_order: 9.3,
    data: {
      heading: "הקהילה שלנו",
      body:
        "בוגרים ותלמידים נפגשים בקבוצה שבה משתפים שאלות מהעבודה הטיפולית, מקורות, והזדמנויות להמשך למידה.",
      cta: { label: "להצטרפות לקהילה", href: "/kehila", open_in_new_tab: false },
    },
  },
  {
    block_type: "newsletter_signup",
    sort_order: 9.6,
    data: {
      heading: "רוצים לשמוע כשנפתחת שנה חדשה?",
      body: "נעדכן אתכם על מועדי פתיחה, ימי עיון ומפגשי היכרות — בלי הצפה.",
      consent_text: "בהרשמה אני מאשר/ת קבלת דיוור בהתאם למדיניות הפרטיות.",
      privacy_link: { label: "מדיניות פרטיות", href: "/privacy", open_in_new_tab: false },
    },
  },
];

const mode = process.argv[2];

if (mode === "add") {
  const rows = blocks.map((b) => ({ page_id: PAGE_ID, is_visible: true, ...b }));
  const { data, error } = await s.from("page_blocks").insert(rows).select("block_type, sort_order");
  if (error) {
    console.error("FAILED:", error);
    process.exit(1);
  }
  console.log(`inserted ${data.length} blocks:`);
  for (const r of data.sort((a, b) => a.sort_order - b.sort_order)) {
    console.log(`  ${r.sort_order}  ${r.block_type}`);
  }
} else if (mode === "revert") {
  const types = blocks.map((b) => b.block_type);
  const { error } = await s
    .from("page_blocks")
    .delete()
    .eq("page_id", PAGE_ID)
    .in("block_type", types);
  console.log(error ? "FAIL: " + error.message : "reverted (added blocks removed)");
}
