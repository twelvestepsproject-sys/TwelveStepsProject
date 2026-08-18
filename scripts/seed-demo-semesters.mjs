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
const mode = process.argv[2];

// Content transcribed from the client's own schedule screenshot.
const session = (label, date, a, b, group) => ({
  label,
  date,
  parts: [
    { title: "שיעור א׳ — יסודות", body: a },
    { title: "שיעור ב׳ — צעדים · נשימה · קליני", body: b },
    { title: "קבוצת עבודה ותרגול", body: group },
  ],
});

const data = {
  heading: "תוכנית המפגשים",
  semesters: [
    {
      title: "סמסטר א׳ · תשתיות: המוח, ההתקשרות והרגש",
      subtitle: "90 ש״א · 15 מפגשים",
      sessions: [
        session(
          "מפגש 1",
          "11.11.26",
          "היכרות: מהו ריפוי חווייתי? הבעיה עם ״לדבר על״ · ארבעת העקרונות",
          "המשפחה הלא-מתפקדת — הבית שממנו באנו",
          "חוזה קבוצתי · מה הביא אותי לכאן",
        ),
        session(
          "מפגש 2",
          "18.11.26",
          "רקע הטיפולים החווייתיים — דינמי, הומניסטי, סומטי",
          "הילד הפנימי — הפגישה הראשונה",
          "תרגיל: מכתב לילד שהייתי",
        ),
        session(
          "מפגש 3",
          "25.11.26",
          "התפתחות המוח I — חמש נקודות המפתח · הרגש כאינטליגנציה",
          "הנשימה כשער — ״ויפח באפיו נשמת חיים״",
          "תרגול: קשב לגוף",
        ),
        session(
          "מפגש 4",
          "2.12.26",
          "התפתחות המוח II — שתי ההמיספרות · המוח כאיבר חברתי",
          "חוסר אונים וחיים בלתי מנוהלים",
          "תרגול: זיהוי דפוס אוטומטי",
        ),
        session(
          "מפגש 5",
          "16.12.26",
          "הפוליוואגלי — שלושת מצבי מערכת העצבים האוטונומית",
          "כוח גדול מאיתנו · המסירה",
          "תרגול: מיפוי מצבי ויסות",
        ),
        session(
          "מפגש 6",
          "23.12.26",
          "מעגלי הישרדות ושגשוג — מ־Surviving ל־Thriving",
          "רגש כמשאב, לא כאויב",
          "תרגול: מתי אני שורד ומתי משגשג",
        ),
      ],
    },
    {
      title: "סמסטר ב׳ · המשפחה הפנימית — עבודת IFS",
      subtitle: "128 ש״א · 15 מפגשים",
      sessions: [
        session(
          "מפגש 1",
          "3.2.27",
          "מבוא ל־IFS — ריבוי החלקים בנפש",
          "מגנים, גולים וכבאי אש",
          "תרגול: זיהוי חלק מגן",
        ),
        session(
          "מפגש 2",
          "10.2.27",
          "ה־Self — תכונות ההנהגה העצמית",
          "Unblending — הפרדה מחלקים",
          "תרגול בזוגות: פנייה פנימה",
        ),
      ],
    },
  ],
};

if (mode === "add") {
  const { error } = await s.from("page_blocks").insert({
    page_id: PAGE_ID,
    training_id: null,
    block_type: "semesters",
    sort_order: 5.5, // after focus_areas, before leader_message
    is_visible: true,
    data,
  });
  console.log(error ? "FAIL: " + error.message : "inserted semesters block");
} else if (mode === "cleanup") {
  const { error } = await s
    .from("page_blocks")
    .delete()
    .eq("page_id", PAGE_ID)
    .eq("block_type", "semesters");
  console.log(error ? "FAIL: " + error.message : "cleaned up");
}
