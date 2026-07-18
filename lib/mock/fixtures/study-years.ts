/**
 * `/tochnit-halimudim/[year-slug]` — Phase 3 page-types task.
 *
 * JUDGMENT CALL (see lib/mock/fixtures/pages.ts's `studiesHubBlocks` comment
 * for the full reasoning): §6 has no schema for a "studies hub" hierarchy
 * distinct from `trainings`. Rather than inventing an un-flagged parallel
 * content model for year sub-pages, this is a small, honestly-additive,
 * NOT-in-§6 fixture — just enough shape (slug, label, short description) to
 * prove the route/`generateStaticParams`/percent-encoded-Hebrew-slug
 * mechanics work, matching the `shana-a` / `shana-b` / `shana-g` slugs
 * already present in lib/mock/fixtures/menus.ts's header dropdown (so the
 * nav's existing links resolve rather than 404).
 *
 * This is intentionally NOT wired into `lib/queries` / `DataSource` — it's
 * a page-local static import, exactly like `docs/content-needed.md` flags
 * it: a genuine gap, not a fabricated entity pretending to be modeled data.
 * If the client's real program turns out to need this as first-class
 * content (admin-editable per year), that's a schema addition for a later
 * phase, done deliberately and with sign-off — not smuggled in here.
 */
export interface StudyYear {
  slug: string;
  yearNumber: number;
  label: string;
  description: string;
}

export const studyYears: StudyYear[] = [
  {
    slug: "shana-a",
    yearNumber: 1,
    label: "שנה א׳",
    description:
      "שנת היסודות: תיאוריה מרכזית בתחום, מיומנויות בסיס בליווי ובהקשבה, והיכרות עם קבוצת הלימוד שמלווה את כל התהליך.",
  },
  {
    slug: "shana-b",
    yearNumber: 2,
    label: "שנה ב׳",
    description:
      "שנת ההעמקה: התמחות בתחומי עשייה ספציפיים, התנסות מודרכת בליווי אמיתי, ותרגול קבוצתי מורכב יותר.",
  },
  {
    slug: "shana-g",
    yearNumber: 3,
    label: "שנה ג׳",
    description:
      "שנת היציאה לשטח: עבודה עצמאית מלווה, הכנה לעבודה מקצועית, וסיכום התהליך האישי והמקצועי שעברו הלומדים.",
  },
];
