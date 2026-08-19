// Verification for the page-block features added for the client's
// year-page requests:
//   - `training_details` (§5 block 21): the "at a glance" details panel,
//     addable to any page, every field optional.
//   - `lecturers_grid` per-page lecturer selection: which lecturers a given
//     block instance shows, in a chosen order.
//
// Each layer here failed silently in a different way during development, so
// all of them are asserted:
//   1. the zod schemas accept the valid shapes and reject malformed ones
//   2. every training_details field really is optional, and a legacy
//      lecturers_grid block (written before `lecturer_ids` existed) still
//      parses and keeps its old behavior
//   3. the admin registry has labels/defaults and routes both types to a
//      real form instead of the raw-JSON fallback
//   4. renderer + editor are actually wired to the new data
//   5. the live Postgres enum contains `training_details` (only when
//      DATA_SOURCE=supabase — without the migration, saving that block 500s
//      even though every TypeScript layer typechecks clean)
//
// Run: pnpm check:blocks   (add DATA_SOURCE=supabase for step 5)

import { readFileSync, existsSync } from "node:fs";

// Load .env.local the same way `next dev` would, so this script can be run
// as plain `pnpm check:blocks` without exporting anything by hand. Real
// environment variables always win, so CI can override.
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().split(/\s+#/)[0].trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

let failures = 0;
let checks = 0;

function check(name, fn) {
  checks += 1;
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  ✗ ${name}`);
    console.error(`      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------
// 1 + 2. Schema shape and optionality
// ---------------------------------------------------------------------
console.log("\n[schema] trainingDetailsBlockDataSchema");

const { trainingDetailsBlockDataSchema, blockTypeSchema, pageBlockSchema } = await import(
  "../lib/schemas/blocks.ts"
);

const ALL_FIELDS = [
  "heading",
  "starts_on",
  "ends_on",
  "meeting_day",
  "meeting_time",
  "sessions_count",
  "academic_hours",
  "price",
  "semesters_count",
  "registration_link",
];

const allNull = Object.fromEntries(ALL_FIELDS.map((f) => [f, null]));

check("accepts a block with every field empty (all optional)", () => {
  const result = trainingDetailsBlockDataSchema.safeParse(allNull);
  assert(result.success, `rejected all-null data: ${JSON.stringify(result.error?.issues)}`);
});

check("accepts a fully-populated block", () => {
  const result = trainingDetailsBlockDataSchema.safeParse({
    heading: "פרטי ההכשרה",
    starts_on: "2026-10-01",
    ends_on: "2027-06-30",
    meeting_day: "יום שלישי",
    meeting_time: "17:00–20:30",
    sessions_count: "30",
    academic_hours: "120",
    price: "3,500 ₪",
    semesters_count: "2",
    registration_link: { label: "להרשמה", href: "/tsor-kesher", open_in_new_tab: false },
  });
  assert(result.success, `rejected valid data: ${JSON.stringify(result.error?.issues)}`);
});

for (const field of ALL_FIELDS) {
  check(`field "${field}" is individually optional`, () => {
    const data = { ...allNull, [field]: null };
    const result = trainingDetailsBlockDataSchema.safeParse(data);
    assert(result.success, `null ${field} was rejected`);
  });
}

check("rejects a wrong-typed field (guards against silent data corruption)", () => {
  const result = trainingDetailsBlockDataSchema.safeParse({ ...allNull, price: 3500 });
  assert(!result.success, "a numeric price should be rejected — price is free text");
});

check("rejects a malformed registration_link", () => {
  const result = trainingDetailsBlockDataSchema.safeParse({
    ...allNull,
    registration_link: { label: "להרשמה" }, // missing href
  });
  assert(!result.success, "a link without href should be rejected");
});

// ---------------------------------------------------------------------
// 3. Enum + discriminated union + admin registry
// ---------------------------------------------------------------------
console.log("\n[registry] block type wiring");

check("'training_details' is a member of blockTypeSchema", () => {
  assert(blockTypeSchema.safeParse("training_details").success, "not in the zod enum");
});

check("pageBlockSchema validates a full training_details block row", () => {
  const result = pageBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    page_id: "00000000-0000-4000-8000-000000000002",
    sort_order: 1,
    is_visible: true,
    block_type: "training_details",
    data: allNull,
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

const { BLOCK_TYPE_LABELS, ALL_BLOCK_TYPES, BLOCK_TYPES_WITH_CUSTOM_FORM, createNewBlock } =
  await import("../lib/admin/block-registry.ts");

check("has a Hebrew label for the add-block picker", () => {
  assert(BLOCK_TYPE_LABELS.training_details, "missing from BLOCK_TYPE_LABELS");
});

check("appears in ALL_BLOCK_TYPES (so it renders in the picker)", () => {
  assert(ALL_BLOCK_TYPES.includes("training_details"), "missing from ALL_BLOCK_TYPES");
});

check("is registered as having a custom form (not the JSON fallback)", () => {
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("training_details"),
    "would fall back to the raw JSON editor",
  );
});

check("createNewBlock produces schema-valid default data", () => {
  const block = createNewBlock("training_details", "00000000-0000-4000-8000-000000000002", 1);
  const result = trainingDetailsBlockDataSchema.safeParse(block.data);
  assert(result.success, `defaults fail their own schema: ${JSON.stringify(result.error?.issues)}`);
});

check("default data leaves every detail field empty (no placeholder dates)", () => {
  const block = createNewBlock("training_details", "00000000-0000-4000-8000-000000000002", 1);
  const seeded = ALL_FIELDS.filter((f) => f !== "heading" && block.data[f] !== null);
  assert(seeded.length === 0, `unexpectedly pre-filled: ${seeded.join(", ")}`);
});

// ---------------------------------------------------------------------
// 4. Renderer + admin form are wired up
// ---------------------------------------------------------------------
console.log("\n[wiring] renderer and admin form");

check("renderBlock has a case for training_details", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "training_details"'), "components/blocks/index.tsx has no case");
  assert(src.includes("TrainingDetails"), "TrainingDetails is not imported/used");
});

check("the page editor dispatches to TrainingDetailsFields", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "training_details"'), "page-editor.tsx has no case");
  assert(src.includes("TrainingDetailsFields"), "TrainingDetailsFields is not imported/used");
});

// ---------------------------------------------------------------------
// 4b. Lecturers grid — per-page lecturer selection
// ---------------------------------------------------------------------
console.log("\n[schema] lecturersGridBlockDataSchema — lecturer selection");

const { lecturersGridBlockDataSchema } = await import("../lib/schemas/blocks.ts");

const LECTURER_A = "70000000-0000-4000-8000-00000000000a";
const LECTURER_B = "70000000-0000-4000-8000-00000000000b";

check("BACKWARD COMPAT: parses a legacy block with no lecturer_ids field", () => {
  const result = lecturersGridBlockDataSchema.safeParse({
    heading: "המרצים שלנו",
    all_lecturers_link: null,
  });
  assert(result.success, `legacy block rejected: ${JSON.stringify(result.error?.issues)}`);
  assert(
    Array.isArray(result.data.lecturer_ids) && result.data.lecturer_ids.length === 0,
    "lecturer_ids should default to an empty array so legacy blocks keep their old behavior",
  );
});

check("accepts an explicit lecturer selection", () => {
  const result = lecturersGridBlockDataSchema.safeParse({
    heading: null,
    all_lecturers_link: null,
    lecturer_ids: [LECTURER_A, LECTURER_B],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
  assert(result.data.lecturer_ids.length === 2, "selection was not preserved");
});

check("preserves selection ORDER (order drives display order)", () => {
  const result = lecturersGridBlockDataSchema.safeParse({
    heading: null,
    all_lecturers_link: null,
    lecturer_ids: [LECTURER_B, LECTURER_A],
  });
  assert(result.success, "rejected a reordered selection");
  assert(
    result.data.lecturer_ids[0] === LECTURER_B,
    "order was normalized away — display order would be lost",
  );
});

check("rejects a non-uuid lecturer id", () => {
  const result = lecturersGridBlockDataSchema.safeParse({
    heading: null,
    all_lecturers_link: null,
    lecturer_ids: ["not-a-uuid"],
  });
  assert(!result.success, "a malformed id should be rejected");
});

check("createNewBlock('lecturers_grid') defaults to an empty selection", () => {
  const block = createNewBlock("lecturers_grid", "00000000-0000-4000-8000-000000000002", 1);
  const result = lecturersGridBlockDataSchema.safeParse(block.data);
  assert(result.success, "defaults fail their own schema");
  assert(result.data.lecturer_ids.length === 0, "should start unselected");
});

check("lecturers_grid is registered as having a custom form", () => {
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("lecturers_grid"),
    "would fall back to the raw JSON editor",
  );
});

check("the page editor dispatches to LecturersGridFields", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "lecturers_grid"'), "page-editor.tsx has no case");
  assert(src.includes("LecturersGridFields"), "LecturersGridFields is not imported/used");
});

check("the renderer honors data.lecturer_ids", () => {
  const src = readFileSync(
    new URL("../components/blocks/lecturers-grid.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("lecturer_ids"), "the renderer ignores the selection");
});

check("the editor page passes lecturers into PageEditor", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("listLecturers"), "lecturers are never fetched server-side");
  assert(src.includes("lecturers={"), "lecturers are never passed to the editor");
});

// ---------------------------------------------------------------------
// 4c. Requirements list
// ---------------------------------------------------------------------
console.log("\n[schema] requirementsBlockDataSchema");

const { requirementsBlockDataSchema } = await import("../lib/schemas/blocks.ts");

check("accepts a heading-only block (empty list is a valid draft state)", () => {
  const result = requirementsBlockDataSchema.safeParse({
    heading: "דרישות ההכשרה",
    intro: null,
    items: [],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("defaults items to [] when the field is absent", () => {
  const result = requirementsBlockDataSchema.safeParse({
    heading: "דרישות ההכשרה",
    intro: null,
  });
  assert(result.success, "rejected a block with no items field");
  assert(Array.isArray(result.data.items), "items did not default to an array");
});

check("accepts an unbounded list (no min/max cap, unlike focus_areas)", () => {
  const many = Array.from({ length: 40 }, (_, i) => `דרישה ${i + 1}`);
  const result = requirementsBlockDataSchema.safeParse({
    heading: "דרישות",
    intro: "טקסט פתיחה",
    items: many,
  });
  assert(result.success, "a long list was rejected");
  assert(result.data.items.length === 40, "items were truncated");
});

check("preserves item ORDER (order drives display order)", () => {
  const result = requirementsBlockDataSchema.safeParse({
    heading: "דרישות",
    intro: null,
    items: ["ג", "א", "ב"],
  });
  assert(result.success, "rejected");
  assert(result.data.items[0] === "ג", "order was normalized away");
});

check("requires a heading (the one non-optional field)", () => {
  const result = requirementsBlockDataSchema.safeParse({ intro: null, items: [] });
  assert(!result.success, "a block with no heading should be rejected");
});

check("rejects non-string items (guards against corrupt data)", () => {
  const result = requirementsBlockDataSchema.safeParse({
    heading: "דרישות",
    intro: null,
    items: ["תקין", 42],
  });
  assert(!result.success, "a numeric item should be rejected");
});

check("'requirements' is a member of blockTypeSchema", () => {
  assert(blockTypeSchema.safeParse("requirements").success, "not in the zod enum");
});

check("has a Hebrew label and appears in the add-block picker", () => {
  assert(BLOCK_TYPE_LABELS.requirements, "missing from BLOCK_TYPE_LABELS");
  assert(ALL_BLOCK_TYPES.includes("requirements"), "missing from ALL_BLOCK_TYPES");
});

check("is registered as having a custom form", () => {
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("requirements"),
    "would fall back to the raw JSON editor",
  );
});

check("createNewBlock produces schema-valid default data", () => {
  const block = createNewBlock("requirements", "00000000-0000-4000-8000-000000000002", 1);
  const result = requirementsBlockDataSchema.safeParse(block.data);
  assert(result.success, `defaults fail their own schema: ${JSON.stringify(result.error?.issues)}`);
});

check("renderBlock has a case for requirements", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "requirements"'), "components/blocks/index.tsx has no case");
  assert(src.includes("Requirements"), "Requirements is not imported/used");
});

check("the page editor dispatches to RequirementsFields", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "requirements"'), "page-editor.tsx has no case");
  assert(src.includes("RequirementsFields"), "RequirementsFields is not imported/used");
});

check("the renderer filters out blank rows", () => {
  const src = readFileSync(new URL("../components/blocks/requirements.tsx", import.meta.url), "utf8");
  assert(src.includes("trim()"), "blank items would render as empty bullets");
});

// ---------------------------------------------------------------------
// 4d. FAQ accordion
// ---------------------------------------------------------------------
console.log("\n[schema] faqBlockDataSchema");

const { faqBlockDataSchema } = await import("../lib/schemas/blocks.ts");

check("accepts a heading-only block (empty list is a valid draft state)", () => {
  const result = faqBlockDataSchema.safeParse({ heading: "שאלות נפוצות", intro: null, items: [] });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("defaults items to [] when the field is absent", () => {
  const result = faqBlockDataSchema.safeParse({ heading: "שאלות נפוצות", intro: null });
  assert(result.success, "rejected a block with no items field");
  assert(Array.isArray(result.data.items), "items did not default to an array");
});

check("accepts an unbounded list of question/answer pairs", () => {
  const many = Array.from({ length: 50 }, (_, i) => ({
    question: `שאלה ${i + 1}`,
    answer: `תשובה ${i + 1}`,
  }));
  const result = faqBlockDataSchema.safeParse({ heading: "שאלות", intro: null, items: many });
  assert(result.success, "a long list was rejected");
  assert(result.data.items.length === 50, "items were truncated");
});

check("preserves item ORDER", () => {
  const result = faqBlockDataSchema.safeParse({
    heading: "שאלות",
    intro: null,
    items: [
      { question: "ג", answer: "3" },
      { question: "א", answer: "1" },
    ],
  });
  assert(result.success, "rejected");
  assert(result.data.items[0].question === "ג", "order was normalized away");
});

check("requires a heading", () => {
  const result = faqBlockDataSchema.safeParse({ intro: null, items: [] });
  assert(!result.success, "a block with no heading should be rejected");
});

check("rejects an item missing its answer field", () => {
  const result = faqBlockDataSchema.safeParse({
    heading: "שאלות",
    intro: null,
    items: [{ question: "שאלה" }],
  });
  assert(!result.success, "an item without an answer should be rejected");
});

check("'faq' is a member of blockTypeSchema", () => {
  assert(blockTypeSchema.safeParse("faq").success, "not in the zod enum");
});

check("has a Hebrew label and appears in the add-block picker", () => {
  assert(BLOCK_TYPE_LABELS.faq, "missing from BLOCK_TYPE_LABELS");
  assert(ALL_BLOCK_TYPES.includes("faq"), "missing from ALL_BLOCK_TYPES");
});

check("is registered as having a custom form", () => {
  assert(BLOCK_TYPES_WITH_CUSTOM_FORM.includes("faq"), "would fall back to the raw JSON editor");
});

check("createNewBlock produces schema-valid default data", () => {
  const block = createNewBlock("faq", "00000000-0000-4000-8000-000000000002", 1);
  const result = faqBlockDataSchema.safeParse(block.data);
  assert(result.success, `defaults fail their own schema: ${JSON.stringify(result.error?.issues)}`);
});

check("renderBlock has a case for faq", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "faq"'), "components/blocks/index.tsx has no case");
  assert(src.includes("Faq"), "Faq is not imported/used");
});

check("the page editor dispatches to FaqFields", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "faq"'), "page-editor.tsx has no case");
  assert(src.includes("FaqFields"), "FaqFields is not imported/used");
});

check("renders as a native <details> accordion (keyboard-accessible)", () => {
  const src = readFileSync(new URL("../components/blocks/faq.tsx", import.meta.url), "utf8");
  assert(src.includes("<details"), "not built on <details>");
  assert(src.includes("<summary"), "missing <summary> — would not be operable");
});

check("emits FAQPage JSON-LD (§9)", () => {
  const src = readFileSync(new URL("../components/blocks/faq.tsx", import.meta.url), "utf8");
  assert(src.includes("FAQPage"), "no FAQPage structured data");
});

check("drops rows with a blank question", () => {
  const src = readFileSync(new URL("../components/blocks/faq.tsx", import.meta.url), "utf8");
  assert(src.includes("question.trim()"), "blank questions would render as empty rows");
});

// ---------------------------------------------------------------------
// 4e. Reading list (core books / sources)
// ---------------------------------------------------------------------
console.log("\n[schema] readingListBlockDataSchema");

const { readingListBlockDataSchema } = await import("../lib/schemas/blocks.ts");
const COVER_ID = "80000000-0000-4000-8000-00000000001d";

check("accepts an item with ONLY a title (everything else optional)", () => {
  const result = readingListBlockDataSchema.safeParse({
    heading: "ספרי ליבה",
    intro: null,
    items: [{ title: "שם הספר", cover_media_id: null, description: null, link: null }],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("accepts a fully-populated item", () => {
  const result = readingListBlockDataSchema.safeParse({
    heading: "ספרי ליבה",
    intro: "רשימת הקריאה לשנה א׳",
    items: [
      {
        title: "שם הספר",
        cover_media_id: COVER_ID,
        description: "תיאור קצר",
        link: { label: "לרכישה", href: "https://example.com", open_in_new_tab: true },
      },
    ],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("accepts an unbounded list", () => {
  const many = Array.from({ length: 30 }, (_, i) => ({
    title: `ספר ${i + 1}`,
    cover_media_id: null,
    description: null,
    link: null,
  }));
  const result = readingListBlockDataSchema.safeParse({
    heading: "ספרים",
    intro: null,
    items: many,
  });
  assert(result.success, "a long list was rejected");
  assert(result.data.items.length === 30, "items were truncated");
});

check("preserves item ORDER", () => {
  const mk = (t) => ({ title: t, cover_media_id: null, description: null, link: null });
  const result = readingListBlockDataSchema.safeParse({
    heading: "ספרים",
    intro: null,
    items: [mk("ג"), mk("א")],
  });
  assert(result.success, "rejected");
  assert(result.data.items[0].title === "ג", "order was normalized away");
});

check("rejects a non-uuid cover_media_id", () => {
  const result = readingListBlockDataSchema.safeParse({
    heading: "ספרים",
    intro: null,
    items: [{ title: "ספר", cover_media_id: "not-a-uuid", description: null, link: null }],
  });
  assert(!result.success, "a malformed media id should be rejected");
});

check("requires a heading", () => {
  const result = readingListBlockDataSchema.safeParse({ intro: null, items: [] });
  assert(!result.success, "a block with no heading should be rejected");
});

check("'reading_list' is a member of blockTypeSchema", () => {
  assert(blockTypeSchema.safeParse("reading_list").success, "not in the zod enum");
});

check("has a Hebrew label and appears in the add-block picker", () => {
  assert(BLOCK_TYPE_LABELS.reading_list, "missing from BLOCK_TYPE_LABELS");
  assert(ALL_BLOCK_TYPES.includes("reading_list"), "missing from ALL_BLOCK_TYPES");
});

check("is registered as having a custom form", () => {
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("reading_list"),
    "would fall back to the raw JSON editor",
  );
});

check("createNewBlock produces schema-valid default data", () => {
  const block = createNewBlock("reading_list", "00000000-0000-4000-8000-000000000002", 1);
  const result = readingListBlockDataSchema.safeParse(block.data);
  assert(result.success, `defaults fail their own schema: ${JSON.stringify(result.error?.issues)}`);
});

check("renderBlock has a case for reading_list, wrapped in Suspense", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "reading_list"'), "components/blocks/index.tsx has no case");
  assert(src.includes("ReadingListSafe"), "missing the error-boundary wrapper used by async blocks");
  assert(src.includes("ReadingListSkeleton"), "missing a Suspense fallback");
});

check("the page editor dispatches to ReadingListFields with mediaById", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "reading_list"'), "page-editor.tsx has no case");
  assert(src.includes("ReadingListFields"), "ReadingListFields is not imported/used");
  assert(
    /ReadingListFields[^/]*mediaById/.test(src),
    "cover thumbnails need mediaById passed through",
  );
});

check("drops rows with a blank title", () => {
  const src = readFileSync(new URL("../components/blocks/reading-list.tsx", import.meta.url), "utf8");
  assert(src.includes("title.trim()"), "blank titles would render as empty cards");
});

// ---------------------------------------------------------------------
// 4f. Training page blocks (migration 20)
// ---------------------------------------------------------------------
console.log("\n[schema] training page blocks");

const TRAINING_SECTION_TYPES = [
  "training_intro",
  "training_body",
  "training_syllabus",
  "training_instructors",
  "training_registration_cta",
];

for (const type of TRAINING_SECTION_TYPES) {
  check(`'${type}' is wired end-to-end`, () => {
    assert(blockTypeSchema.safeParse(type).success, "not in the zod enum");
    assert(BLOCK_TYPE_LABELS[type], "missing a Hebrew label");
    assert(BLOCK_TYPES_WITH_CUSTOM_FORM.includes(type), "would fall back to raw JSON");
    const block = createNewBlock(type, "00000000-0000-4000-8000-000000000002", 1);
    assert(block.data !== undefined, "createNewBlock produced no default data");
  });
}

check("a block may be owned by a training instead of a page", () => {
  const result = pageBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    page_id: null,
    training_id: "00000000-0000-4000-8000-000000000003",
    sort_order: 1,
    is_visible: true,
    block_type: "training_intro",
    data: { show_cover: true, show_details: true },
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("BACKWARD COMPAT: page-owned blocks still parse without training_id", () => {
  const result = pageBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    page_id: "00000000-0000-4000-8000-000000000002",
    sort_order: 1,
    is_visible: true,
    block_type: "faq",
    data: { heading: "שאלות", intro: null, items: [] },
  });
  assert(result.success, `legacy page block rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("the training page renders from blocks with a default-layout fallback", () => {
  const src = readFileSync(
    new URL("../app/(site)/hachsharot/[slug]/page.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("DEFAULT_TRAINING_LAYOUT"), "no fallback layout for unconverted trainings");
  assert(src.includes("renderTrainingBlock"), "not block-driven");
  assert(src.includes("renderBlock"), "generic content blocks are not dispatched");
});

check("training sections read content from the training, not from data", () => {
  const src = readFileSync(
    new URL("../components/blocks/training-sections.tsx", import.meta.url),
    "utf8",
  );
  // Guards the single-source-of-truth rule: if a section ever started
  // storing e.g. its own title in `data`, /admin/trainings would stop
  // being the one place that content is edited.
  assert(src.includes("training.title"), "intro no longer reads the training title");
  assert(src.includes("training.syllabus"), "syllabus no longer reads the training syllabus");
  assert(src.includes("training.instructors"), "instructors no longer read the training");
});

check("the DataSource exposes training block read/write", () => {
  const src = readFileSync(new URL("../lib/queries/types.ts", import.meta.url), "utf8");
  assert(src.includes("getTrainingBlocksAdmin"), "no admin read method");
  assert(src.includes("saveTrainingBlocks"), "no save method");
});

check("saveTraining does not try to write `blocks` as a column", () => {
  const src = readFileSync(new URL("../lib/queries/supabase/index.ts", import.meta.url), "utf8");
  assert(
    /const \{ id, instructors, blocks, \.\.\.fields \}/.test(src),
    "`blocks` would be sent to Postgres as an unknown column",
  );
});

check("the trainings admin page mounts the block editor", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/trainings/[id]/page.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("TrainingBlocksEditor"), "editor not mounted");
  assert(src.includes("TrainingForm"), "the original training form was removed");
});

// ---------------------------------------------------------------------
// 4g. Link cards
// ---------------------------------------------------------------------
console.log("\n[schema] linkCardsBlockDataSchema");

const { linkCardsBlockDataSchema } = await import("../lib/schemas/blocks.ts");

check("accepts a card with ONLY a title", () => {
  const result = linkCardsBlockDataSchema.safeParse({
    heading: null,
    intro: null,
    cards: [{ title: "שנה א׳", body: null, image_media_id: null, link: null }],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("accepts a fully-populated card", () => {
  const result = linkCardsBlockDataSchema.safeParse({
    heading: "בחרו שנה",
    intro: "שלוש שנות המסלול",
    cards: [
      {
        title: "שנה א׳",
        body: "יסודות",
        image_media_id: COVER_ID,
        link: { label: "לשנה א׳", href: "/shana-a", open_in_new_tab: false },
      },
    ],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("preserves card ORDER", () => {
  const mk = (t) => ({ title: t, body: null, image_media_id: null, link: null });
  const result = linkCardsBlockDataSchema.safeParse({
    heading: null,
    intro: null,
    cards: [mk("ג"), mk("א")],
  });
  assert(result.success, "rejected");
  assert(result.data.cards[0].title === "ג", "order was normalized away");
});

check("rejects a non-uuid image id", () => {
  const result = linkCardsBlockDataSchema.safeParse({
    heading: null,
    intro: null,
    cards: [{ title: "x", body: null, image_media_id: "nope", link: null }],
  });
  assert(!result.success, "a malformed media id should be rejected");
});

check("'link_cards' is wired into registry and picker", () => {
  assert(blockTypeSchema.safeParse("link_cards").success, "not in the zod enum");
  assert(BLOCK_TYPE_LABELS.link_cards, "missing a Hebrew label");
  assert(ALL_BLOCK_TYPES.includes("link_cards"), "missing from ALL_BLOCK_TYPES");
  assert(BLOCK_TYPES_WITH_CUSTOM_FORM.includes("link_cards"), "would fall back to raw JSON");
});

check("createNewBlock produces schema-valid default data", () => {
  const block = createNewBlock("link_cards", "00000000-0000-4000-8000-000000000002", 1);
  const result = linkCardsBlockDataSchema.safeParse(block.data);
  assert(result.success, `defaults fail their own schema: ${JSON.stringify(result.error?.issues)}`);
});

check("renderBlock has a case for link_cards, wrapped in Suspense", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "link_cards"'), "no case in components/blocks/index.tsx");
  assert(src.includes("LinkCardsSafe"), "missing the async error-boundary wrapper");
  assert(src.includes("LinkCardsSkeleton"), "missing a Suspense fallback");
});

check("the page editor dispatches to LinkCardsFields with mediaById", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "link_cards"'), "page-editor.tsx has no case");
  assert(/LinkCardsFields[^/]*mediaById/.test(src), "card thumbnails need mediaById");
});

check("drops cards with a blank title", () => {
  const src = readFileSync(new URL("../components/blocks/link-cards.tsx", import.meta.url), "utf8");
  assert(src.includes("title.trim()"), "blank cards would render as empty tiles");
});

check("does not nest an <a> inside the card anchor (invalid HTML)", () => {
  const src = readFileSync(new URL("../components/blocks/link-cards.tsx", import.meta.url), "utf8");
  // The button affordance must be a span; the card itself is the anchor.
  assert(
    src.includes("<span className=\"mt-auto pt-3 font-semibold text-primary\">"),
    "the card button should render as a span inside the card anchor",
  );
});

// ---------------------------------------------------------------------
// 4h. Certificates + syllabus download
// ---------------------------------------------------------------------
console.log("\n[schema] certificatesBlockDataSchema");

const { certificatesBlockDataSchema, syllabusDownloadBlockDataSchema } = await import(
  "../lib/schemas/blocks.ts"
);

check("accepts several certificate images", () => {
  const result = certificatesBlockDataSchema.safeParse({
    heading: "התעודות שתקבלו",
    intro: "תעודת גמר מטעם…",
    items: [
      { media_id: COVER_ID, caption: null },
      { media_id: COVER_ID, caption: "תעודת הסמכה" },
    ],
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
  assert(result.data.items.length === 2, "items were dropped");
});

check("requires a heading", () => {
  const result = certificatesBlockDataSchema.safeParse({ intro: null, items: [] });
  assert(!result.success, "a block with no heading should be rejected");
});

check("rejects a non-uuid media id", () => {
  const result = certificatesBlockDataSchema.safeParse({
    heading: "x",
    intro: null,
    items: [{ media_id: "nope", caption: null }],
  });
  assert(!result.success, "a malformed media id should be rejected");
});

check("certificates is wired into registry and picker", () => {
  assert(blockTypeSchema.safeParse("certificates").success, "not in the zod enum");
  assert(BLOCK_TYPE_LABELS.certificates, "missing a Hebrew label");
  assert(ALL_BLOCK_TYPES.includes("certificates"), "missing from ALL_BLOCK_TYPES");
  assert(BLOCK_TYPES_WITH_CUSTOM_FORM.includes("certificates"), "would fall back to raw JSON");
  const block = createNewBlock("certificates", "00000000-0000-4000-8000-000000000002", 1);
  assert(certificatesBlockDataSchema.safeParse(block.data).success, "defaults fail their schema");
});

check("certificates renders images uncropped (a certificate must not be cut)", () => {
  const src = readFileSync(new URL("../components/blocks/certificates.tsx", import.meta.url), "utf8");
  assert(src.includes("object-contain"), "object-cover would crop the certificate");
  assert(!/alt=\{[^}]*caption/.test(src), "caption must not be used as alt text");
});

check("certificates is dispatched with Suspense + error boundary", () => {
  const src = readFileSync(new URL("../components/blocks/index.tsx", import.meta.url), "utf8");
  assert(src.includes('case "certificates"'), "no case in the block registry");
  assert(src.includes("CertificatesSafe"), "missing the async error-boundary wrapper");
});

console.log("\n[schema] syllabusDownloadBlockDataSchema");

check("accepts an external file URL (Drive/Dropbox)", () => {
  const result = syllabusDownloadBlockDataSchema.safeParse({
    heading: null,
    body: null,
    file_url: "https://drive.google.com/file/d/abc/view",
    button_label: "סילבוס להורדה",
    open_in_new_tab: true,
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("accepts an empty URL as a draft state", () => {
  const result = syllabusDownloadBlockDataSchema.safeParse({
    heading: null,
    body: null,
    file_url: "",
    button_label: null,
  });
  assert(result.success, "an unfinished block should still save");
  assert(result.data.open_in_new_tab === true, "open_in_new_tab should default to true");
});

check("syllabus_download is wired into registry and picker", () => {
  assert(blockTypeSchema.safeParse("syllabus_download").success, "not in the zod enum");
  assert(BLOCK_TYPE_LABELS.syllabus_download, "missing a Hebrew label");
  assert(ALL_BLOCK_TYPES.includes("syllabus_download"), "missing from ALL_BLOCK_TYPES");
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("syllabus_download"),
    "would fall back to raw JSON",
  );
  const block = createNewBlock("syllabus_download", "00000000-0000-4000-8000-000000000002", 1);
  assert(
    syllabusDownloadBlockDataSchema.safeParse(block.data).success,
    "defaults fail their schema",
  );
});

check("hides the button until a file is set (never a dead link)", () => {
  const src = readFileSync(
    new URL("../components/blocks/syllabus-download.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("if (!href) return null"), "an empty file would render a dead button");
});

check("accepts an uploaded PDF by media id", () => {
  const result = syllabusDownloadBlockDataSchema.safeParse({
    heading: null,
    body: null,
    file_media_id: COVER_ID,
    file_url: "",
    button_label: null,
  });
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("BACKWARD COMPAT: a pre-PDF block (url only, no file_media_id) still parses", () => {
  const result = syllabusDownloadBlockDataSchema.safeParse({
    heading: null,
    body: null,
    file_url: "https://drive.google.com/file/d/abc/view",
    button_label: null,
  });
  assert(result.success, "an existing block should keep working");
  assert(result.data.file_media_id === null, "file_media_id should default to null");
});

check("an uploaded file takes precedence over an external URL", () => {
  const src = readFileSync(
    new URL("../components/blocks/syllabus-download.tsx", import.meta.url),
    "utf8",
  );
  assert(
    /uploaded \? mediaUrlFor\(uploaded\) : data\.file_url/.test(src),
    "precedence between the uploaded file and the URL is not explicit",
  );
});

// --- PDF upload support -------------------------------------------------
console.log("\n[upload] PDF support");

check("the upload route accepts application/pdf", () => {
  const src = readFileSync(
    new URL("../app/api/admin/media-upload/route.ts", import.meta.url),
    "utf8",
  );
  assert(src.includes('"application/pdf"'), "PDF is not in the MIME whitelist");
  assert(src.includes("isDocument"), "no document branch for dimension handling");
  assert(
    /!isDoc && \(!width \|\| !height\)/.test(src),
    "documents would still be rejected for having no pixel dimensions",
  );
});

check("documents get a larger size cap than images", () => {
  const src = readFileSync(
    new URL("../app/api/admin/media-upload/route.ts", import.meta.url),
    "utf8",
  );
  assert(src.includes("MAX_DOC_BYTES"), "no separate document size limit");
});

check("the client skips image processing for PDFs", () => {
  const src = readFileSync(
    new URL("../components/admin/media-picker.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("isDocumentMime"), "no document helper");
  // A PDF pushed through <canvas> would be corrupted.
  assert(
    /maybeResize[\s\S]{0,220}isDocumentMime\(file\.type\)\) return file/.test(src),
    "maybeResize would try to rasterize a PDF",
  );
  assert(src.includes('accept="application/pdf'), "the file input still rejects PDFs");
});

check("PDFs render as an icon, not a broken thumbnail", () => {
  const picker = readFileSync(
    new URL("../components/admin/media-picker.tsx", import.meta.url),
    "utf8",
  );
  const grid = readFileSync(
    new URL("../app/(admin)/admin/media/media-grid.tsx", import.meta.url),
    "utf8",
  );
  assert(picker.includes("isDocumentMime(m.mime_type)"), "picker grid would show a broken image");
  assert(grid.includes("isDocumentMime(media.mime_type)"), "media library would show a broken image");
});

check("both new types are dispatched by the page editor", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(/CertificatesFields[^/]*mediaById/.test(src), "certificate thumbnails need mediaById");
  assert(src.includes("SyllabusDownloadFields"), "syllabus form not dispatched");
});

// ---------------------------------------------------------------------
// 4i. Semesters
// ---------------------------------------------------------------------
console.log("\n[schema] semestersBlockDataSchema");

const { semestersBlockDataSchema } = await import("../lib/schemas/blocks.ts");

const semesterFixture = {
  heading: "תוכנית המפגשים",
  semesters: [
    {
      title: "סמסטר א׳",
      subtitle: "90 ש״א · 15 מפגשים",
      sessions: [
        {
          label: "מפגש 1",
          date: "11.11.26",
          parts: [
            { title: "שיעור א׳", body: "תוכן" },
            { title: "שיעור ב׳", body: null },
          ],
        },
      ],
    },
  ],
};

check("accepts the full three-level shape", () => {
  const result = semestersBlockDataSchema.safeParse(semesterFixture);
  assert(result.success, `rejected: ${JSON.stringify(result.error?.issues)}`);
});

check("all three levels are unbounded", () => {
  const parts = Array.from({ length: 12 }, (_, i) => ({ title: `חלק ${i}`, body: null }));
  const sessions = Array.from({ length: 30 }, (_, i) => ({
    label: `מפגש ${i}`,
    date: null,
    parts,
  }));
  const result = semestersBlockDataSchema.safeParse({
    heading: null,
    semesters: Array.from({ length: 6 }, () => ({ title: "ס", subtitle: null, sessions })),
  });
  assert(result.success, "a large schedule was rejected");
  assert(result.data.semesters[0].sessions[0].parts.length === 12, "parts were truncated");
});

check("session label is free text (supports 'יום עיון מרוכז', not just numbers)", () => {
  const result = semestersBlockDataSchema.safeParse({
    heading: null,
    semesters: [
      {
        title: "ס",
        subtitle: null,
        sessions: [{ label: "יום עיון מרוכז", date: null, parts: [] }],
      },
    ],
  });
  assert(result.success, "a non-numeric session label should be allowed");
});

check("date and part body are optional", () => {
  const result = semestersBlockDataSchema.safeParse({
    heading: null,
    semesters: [
      {
        title: "ס",
        subtitle: null,
        sessions: [{ label: "מפגש 1", date: null, parts: [{ title: "שיעור א׳", body: null }] }],
      },
    ],
  });
  assert(result.success, "a session with no date should be allowed");
});

check("preserves ORDER at every level", () => {
  const result = semestersBlockDataSchema.safeParse({
    heading: null,
    semesters: [
      { title: "ב", subtitle: null, sessions: [] },
      { title: "א", subtitle: null, sessions: [] },
    ],
  });
  assert(result.success, "rejected");
  assert(result.data.semesters[0].title === "ב", "semester order was normalized away");
});

check("'semesters' is wired into registry and picker", () => {
  assert(blockTypeSchema.safeParse("semesters").success, "not in the zod enum");
  assert(BLOCK_TYPE_LABELS.semesters, "missing a Hebrew label");
  assert(ALL_BLOCK_TYPES.includes("semesters"), "missing from ALL_BLOCK_TYPES");
  assert(BLOCK_TYPES_WITH_CUSTOM_FORM.includes("semesters"), "would fall back to raw JSON");
  const block = createNewBlock("semesters", "00000000-0000-4000-8000-000000000002", 1);
  assert(semestersBlockDataSchema.safeParse(block.data).success, "defaults fail their schema");
});

check("renders collapsed by default (no `open` attribute)", () => {
  const src = readFileSync(new URL("../components/blocks/semesters.tsx", import.meta.url), "utf8");
  assert(src.includes("<details"), "not built on a native disclosure");
  assert(!/<details[^>]*\sopen[\s>]/.test(src), "semesters would render expanded");
});

check("side by side on desktop, stacked on mobile", () => {
  const src = readFileSync(new URL("../components/blocks/semesters.tsx", import.meta.url), "utf8");
  assert(src.includes("grid-cols-1"), "not stacked on mobile");
  assert(src.includes("lg:grid-cols-2"), "not side by side on desktop");
  assert(/semesters.length > 1/.test(src), "a lone semester would still be half-width");
  // Without items-start, expanding one semester stretches its collapsed
  // sibling to the same height, leaving a tall empty gap.
  assert(src.includes("items-start"), "grid items would stretch to equal height");
});

check("drops empty semesters and sessions", () => {
  const src = readFileSync(new URL("../components/blocks/semesters.tsx", import.meta.url), "utf8");
  assert(src.includes("s.title.trim()"), "an untitled semester would render as a blank panel");
  assert(src.includes("s.label.trim()"), "an unlabelled session would render blank");
});

check("the page editor dispatches to SemestersFields", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "semesters"'), "page-editor.tsx has no case");
  assert(src.includes("SemestersFields"), "SemestersFields is not imported/used");
});

// ---------------------------------------------------------------------
// 4j. Client feedback round: subheadings, extra detail fields, labels
// ---------------------------------------------------------------------
console.log("\n[schema] client feedback fixes");

const { focusAreasBlockDataSchema, programStagesBlockDataSchema } = await import(
  "../lib/schemas/blocks.ts"
);

const threeCards = [
  { icon: null, title: "א", body: "ב" },
  { icon: null, title: "ג", body: "ד" },
  { icon: null, title: "ה", body: "ו" },
];

check("focus_areas accepts a separate subheading", () => {
  const result = focusAreasBlockDataSchema.safeParse({
    heading: "למי מיועדת התוכנית?",
    subheading: "לאנשי מקצוע ולקהל הרחב",
    cards: threeCards,
  });
  assert(result.success, "a block with a subheading was rejected");
});

check("BACKWARD COMPAT: a focus_areas block with no subheading still parses", () => {
  const result = focusAreasBlockDataSchema.safeParse({ heading: "כותרת", cards: threeCards });
  assert(result.success, "an existing block should keep working");
  assert(result.data.subheading === null, "subheading should default to null");
});

check("focus_areas renders the subheading under the heading", () => {
  const src = readFileSync(new URL("../components/blocks/focus-areas.tsx", import.meta.url), "utf8");
  assert(src.includes("data.subheading"), "the renderer ignores the subheading");
});

check("training_details has location, duration and cohort fields", () => {
  const result = trainingDetailsBlockDataSchema.safeParse({
    ...allNull,
    location: "תל אביב",
    duration: "3 שנים",
    cohort_number: "מחזור 5",
  });
  assert(result.success, "the new fields were rejected");
});

check("BACKWARD COMPAT: a training_details block without the new fields parses", () => {
  const result = trainingDetailsBlockDataSchema.safeParse(allNull);
  assert(result.success, "an existing block should keep working");
  assert(result.data.location === null, "location should default to null");
});

check("training_details renders the three new rows", () => {
  const src = readFileSync(
    new URL("../components/blocks/training-details.tsx", import.meta.url),
    "utf8",
  );
  for (const label of ["משך המסלול", "מספר מחזור", "מיקום"]) {
    assert(src.includes(label), "missing row: " + label);
  }
});

check("program_stages labels are editable, defaulting to the original wording", () => {
  const result = programStagesBlockDataSchema.safeParse({ heading: null });
  assert(result.success, "an existing block should keep working");
  assert(result.data.stage_label === null, "stage_label should default to null");
  const src = readFileSync(
    new URL("../components/blocks/program-stages-stepper.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("data.stage_label"), "stage prefix is still hardcoded");
  assert(src.includes("data.step_label"), "step prefix is still hardcoded");
});

check("program_stages now has a real admin form, not raw JSON", () => {
  assert(
    BLOCK_TYPES_WITH_CUSTOM_FORM.includes("program_stages"),
    "would fall back to the raw JSON editor",
  );
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes('case "program_stages"'), "page-editor.tsx has no case");
});


// ---------------------------------------------------------------------
// 4k. Shared blocks (migration 24)
// ---------------------------------------------------------------------
console.log("\n[schema] shared blocks");

const { sharedBlockSchema } = await import("../lib/schemas/blocks.ts");

check("sharedBlockSchema accepts a named block with content", () => {
  const result = sharedBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    name: "הספרייה של הנני",
    block_type: "reading_list",
    data: { heading: "ספרים", intro: null, items: [] },
    created_at: "2026-08-19T00:00:00Z",
    updated_at: "2026-08-19T00:00:00Z",
  });
  assert(result.success, "a valid shared block was rejected");
});

check("a page_blocks row may carry shared_block_id", () => {
  const result = pageBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    page_id: "00000000-0000-4000-8000-000000000002",
    shared_block_id: "00000000-0000-4000-8000-000000000003",
    sort_order: 1,
    is_visible: true,
    block_type: "reading_list",
    data: { heading: "x", intro: null, items: [] },
  });
  assert(result.success, "a reference row was rejected");
});

check("BACKWARD COMPAT: rows without shared_block_id still parse", () => {
  const result = pageBlockSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    page_id: "00000000-0000-4000-8000-000000000002",
    sort_order: 1,
    is_visible: true,
    block_type: "faq",
    data: { heading: "שאלות", intro: null, items: [] },
  });
  assert(result.success, "an ordinary inline block should be unaffected");
});

check("the DataSource exposes shared-block CRUD", () => {
  const src = readFileSync(new URL("../lib/queries/types.ts", import.meta.url), "utf8");
  for (const m of ["listSharedBlocks", "getSharedBlock", "saveSharedBlock", "deleteSharedBlock"]) {
    assert(src.includes(m), "missing DataSource method: " + m);
  }
});

check("both data sources implement the shared-block methods", () => {
  for (const f of ["../lib/queries/supabase/index.ts", "../lib/queries/mock/index.ts"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    assert(src.includes("listSharedBlocks"), f + " does not implement listSharedBlocks");
    assert(src.includes("saveSharedBlock"), f + " does not implement saveSharedBlock");
  }
});

check("reads resolve references to the shared source", () => {
  const src = readFileSync(new URL("../lib/queries/supabase/index.ts", import.meta.url), "utf8");
  assert(src.includes("resolveSharedBlocks"), "no resolution helper");
  // Both public read paths must resolve, or a shared block renders empty.
  assert(
    (src.match(/await resolveSharedBlocks\(/g) || []).length >= 2,
    "getPage and getTraining must both resolve shared references",
  );
});

check("a reference row stores no content of its own", () => {
  const src = readFileSync(new URL("../lib/queries/supabase/index.ts", import.meta.url), "utf8");
  // Duplicating content into the placement row is what would let the copies
  // drift apart — the exact thing sharing exists to prevent.
  assert(
    (src.match(/data: sharedId \? \{\} : b\.data/g) || []).length >= 2,
    "savePage and saveTrainingBlocks must blank a reference's own data",
  );
});

check("the page editor can insert and promote shared blocks", () => {
  const src = readFileSync(
    new URL("../app/(admin)/admin/pages/page-editor.tsx", import.meta.url),
    "utf8",
  );
  assert(src.includes("addSharedBlock"), "no insert-existing-block control");
  assert(src.includes("shareBlock"), "no promote-to-shared control");
  assert(src.includes("updateSharedBlockData"), "edits would not reach the shared source");
});


// ---------------------------------------------------------------------
// 5. Live Postgres enum (only meaningful against the real DB)
// ---------------------------------------------------------------------
console.log("\n[database] block_type enum");

const dataSource = process.env.DATA_SOURCE ?? "mock";

if (dataSource !== "supabase") {
  console.log("  – DATA_SOURCE is not 'supabase' — skipping the live enum check.");
  console.log("    (Run with DATA_SOURCE=supabase to verify the migration was applied.)");
} else {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const token = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectUrl || !token) {
    failures += 1;
    console.error("  ✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_ACCESS_TOKEN not set — failing closed.");
  } else {
    checks += 1;
    const projectRef = projectUrl.match(/https:\/\/([^.]+)\./)[1];
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'block_type';",
      }),
    });
    if (!res.ok) {
      failures += 1;
      console.error(`  ✗ enum query failed (HTTP ${res.status}) — could not verify the migration.`);
    } else {
      const labels = (await res.json()).map((r) => r.enumlabel);
      const required = [
        ["training_details", "00000000000016_training_details_block.sql"],
        ["requirements", "00000000000017_requirements_block.sql"],
        ["faq", "00000000000018_faq_block.sql"],
        ["reading_list", "00000000000019_reading_list_block.sql"],
        ["training_intro", "00000000000020_training_blocks.sql"],
        ["training_body", "00000000000020_training_blocks.sql"],
        ["training_syllabus", "00000000000020_training_blocks.sql"],
        ["training_instructors", "00000000000020_training_blocks.sql"],
        ["training_registration_cta", "00000000000020_training_blocks.sql"],
        ["link_cards", "00000000000021_link_cards_block.sql"],
        ["certificates", "00000000000022_certificates_and_syllabus_blocks.sql"],
        ["syllabus_download", "00000000000022_certificates_and_syllabus_blocks.sql"],
        ["semesters", "00000000000023_semesters_block.sql"],
      ];
      for (const [value, migration] of required) {
        if (labels.includes(value)) {
          console.log(`  ✓ live block_type enum contains '${value}'`);
        } else {
          failures += 1;
          console.error(`  ✗ live block_type enum is MISSING '${value}'`);
          console.error(`      Apply supabase/migrations/${migration}`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------
console.log(
  `\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
