import {
  pageSchema,
  pageInputSchema,
  postSchema,
  categorySchema,
  trainingSchema,
  lecturerSchema,
  testimonialSchema,
  programStageSchema,
  scheduleEntrySchema,
  gallerySchema,
  podcastEpisodeSchema,
  mediaSchema,
  siteSettingsSchema,
  leadSchema,
  newsletterSubscriberSchema,
  contactMessageSchema,
  redirectSchema,
  profileSchema,
  type Page,
  type PageBlock,
  type SharedBlock,
  type PageInput,
  type Post,
  type PostSummary,
  type Category,
  type Training,
  type Lecturer,
  type Testimonial,
  type ProgramStage,
  type ScheduleEntry,
  type Gallery,
  type PodcastEpisode,
  type Media,
  type SiteSettings,
  type MenuItem,
  type MenuLocation,
  type SearchResult,
  type Lead,
  type LeadInput,
  type NewsletterSubscriber,
  type NewsletterSubscribeInput,
  type ContactMessage,
  type ContactMessageInput,
  type Paginated,
  type Redirect,
  type Profile,
} from "@/lib/schemas";
import type {
  DataSource,
  ListPostsOptions,
  ListTrainingsOptions,
  AdminListOptions,
} from "@/lib/queries/types";
import { mockDb, persist, reindexProgramStages } from "@/lib/mock/store";
import { delay, maybeFail, newId, nowIso, matchesQuery, paginate } from "./helpers";
import { studyYears } from "@/lib/mock/fixtures/study-years";

/**
 * lib/queries/mock/index.ts — the mock implementation of the `DataSource`
 * seam (§5.5). Components never import this module directly; they import
 * `{ db }` from `lib/queries`.
 *
 * Rules held here, not just commented (§5.5 / task brief):
 *  1. Every method is genuinely async (`await delay(...)`, real Promises).
 *  2. Artificial latency via MOCK_LATENCY_MS.
 *  3. Pagination/filtering/sorting/search happen HERE, never left to callers.
 *  4. Published-only by default for public reads — two independent filters
 *     (status === 'published' AND published_at <= now()); `includeDrafts`
 *     bypasses both for admin callers.
 *  5. No joins left to callers — instructors/steps/menu tree resolved here.
 *  6. MOCK_ERROR_RATE simulates random failures.
 *  7. Returns are plain serializable objects (ISO strings, no Date
 *     instances — the fixtures/store already store ISO strings, so this
 *     holds by construction as long as we never wrap them in `new Date()`
 *     before returning).
 *  8. Writes operate against the in-memory store from lib/mock/store.ts,
 *     persisted to .mock-db.json.
 *  9. Testimonial/lecturer self-clearing + consent-gated visibility
 *     (§5.5 / §8) — see saveTestimonial/saveLecturer below.
 * 10. Every write is validated via the zod schema before being committed,
 *     so schema drift is caught immediately (not silently written).
 */


// ---------------------------------------------------------------------
// Shared blocks (migration 24)
// ---------------------------------------------------------------------

/** Mirrors the Supabase implementation: swap every reference row for the
 * shared block's own type and content, dropping references whose source is
 * gone. */
function resolveSharedBlocksMock(blocks: PageBlock[]): PageBlock[] {
  return blocks
    .map((b) => {
      const sharedId = (b as { shared_block_id?: string | null }).shared_block_id;
      if (!sharedId) return b;
      const shared = mockDb.sharedBlocks.find((x) => x.id === sharedId);
      if (!shared) return null;
      return { ...b, block_type: shared.block_type, data: shared.data } as PageBlock;
    })
    .filter((b): b is PageBlock => b !== null);
}

async function listSharedBlocks(): Promise<SharedBlock[]> {
  await delay();
  maybeFail("listSharedBlocks");
  return [...mockDb.sharedBlocks].sort((a, b) => a.name.localeCompare(b.name, "he"));
}

async function getSharedBlock(id: string): Promise<SharedBlock | null> {
  await delay();
  maybeFail("getSharedBlock");
  return mockDb.sharedBlocks.find((b) => b.id === id) ?? null;
}

async function saveSharedBlock(
  input: Partial<SharedBlock> & { id?: string },
): Promise<SharedBlock> {
  await delay();
  maybeFail("saveSharedBlock");
  const existing = input.id ? mockDb.sharedBlocks.find((b) => b.id === input.id) : undefined;
  const merged = {
    ...(existing ?? ({} as SharedBlock)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as SharedBlock;
  if (existing) {
    Object.assign(existing, merged);
  } else {
    mockDb.sharedBlocks.push(merged);
  }
  persist();
  return merged;
}

async function deleteSharedBlock(id: string): Promise<void> {
  await delay();
  maybeFail("deleteSharedBlock");
  mockDb.sharedBlocks = mockDb.sharedBlocks.filter((b) => b.id !== id);
  // The DB cascades this; mirror it so a stale reference can't linger.
  for (const page of mockDb.pages) {
    page.blocks = page.blocks.filter(
      (b) => (b as { shared_block_id?: string | null }).shared_block_id !== id,
    );
  }
  persist();
}

// ---------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------

function isPublicPost(p: Post, now: string): boolean {
  // Two INDEPENDENT filters, both required (§5.5 rule 4 / §6). Do not
  // collapse into one condition: a status-only or date-only filter would
  // pass the wrong rows (see fixtures `machshavot-al-hemshech` — published
  // status but future published_at — and `tiuta-lo-gmura` — draft status
  // but past published_at — each must be excluded, independently, by a
  // different one of these two checks).
  const statusOk = p.status === "published";
  const dateOk = p.published_at !== null && p.published_at <= now;
  return statusOk && dateOk;
}

function toPostSummary(p: Post): PostSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_image_id: p.cover_image_id,
    category: p.category,
    published_at: p.published_at,
    reading_time: p.reading_time,
  };
}

async function listPosts(opts: ListPostsOptions = {}): Promise<Paginated<PostSummary>> {
  await delay();
  maybeFail("listPosts");

  const now = nowIso();
  let rows = mockDb.posts.slice();

  if (!opts.includeDrafts) {
    rows = rows.filter((p) => isPublicPost(p, now));
  }
  if (opts.categorySlug) {
    rows = rows.filter((p) => p.category?.slug === opts.categorySlug);
  }
  if (opts.q) {
    rows = rows.filter((p) => matchesQuery(opts.q!, p.title, p.excerpt, p.slug));
  }
  rows.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));

  const page = paginate(rows, opts.page ?? 1, opts.perPage ?? 10);
  return { ...page, items: page.items.map(toPostSummary) };
}

async function getPost(slug: string): Promise<Post | null> {
  await delay();
  maybeFail("getPost");

  const now = nowIso();
  const row = mockDb.posts.find((p) => p.slug === slug);
  if (!row) return null;
  // getPost has no includeDrafts flag on the interface — treated as a
  // public-facing read (see friction note in final report: admin preview
  // of a draft post currently has no dedicated method).
  if (!isPublicPost(row, now)) return null;
  return row;
}

async function getPostAdmin(id: string): Promise<Post | null> {
  await delay();
  maybeFail("getPostAdmin");
  return mockDb.posts.find((p) => p.id === id) ?? null;
}

async function savePost(input: Partial<Post> & { id?: string }): Promise<Post> {
  await delay();
  maybeFail("savePost");

  const existing = input.id ? mockDb.posts.find((p) => p.id === input.id) : undefined;
  const merged: Post = {
    ...(existing ?? ({} as Post)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_placeholder: false, // self-clearing (§5.5)
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Post;

  const parsed = postSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.posts.push(parsed);
  }
  persist();
  return parsed;
}

async function deletePost(id: string): Promise<void> {
  await delay();
  maybeFail("deletePost");
  mockDb.posts = mockDb.posts.filter((p) => p.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

async function listCategories(): Promise<Category[]> {
  await delay();
  maybeFail("listCategories");
  return mockDb.categories.slice();
}

async function getCategory(slug: string): Promise<Category | null> {
  await delay();
  maybeFail("getCategory");
  return mockDb.categories.find((c) => c.slug === slug) ?? null;
}

async function saveCategory(input: Partial<Category> & { id?: string }): Promise<Category> {
  await delay();
  maybeFail("saveCategory");

  const existing = input.id ? mockDb.categories.find((c) => c.id === input.id) : undefined;
  const merged: Category = {
    ...(existing ?? ({} as Category)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Category;

  const parsed = categorySchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.categories.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteCategory(id: string): Promise<void> {
  await delay();
  maybeFail("deleteCategory");
  mockDb.categories = mockDb.categories.filter((c) => c.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------

async function listTrainings(opts: ListTrainingsOptions = {}): Promise<Training[]> {
  await delay();
  maybeFail("listTrainings");

  let rows = mockDb.trainings.slice();
  if (!opts.includeDrafts) {
    rows = rows.filter((t) => t.status === "published");
  }
  if (opts.featuredOnly) {
    rows = rows.filter((t) => t.is_featured);
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return rows;
}

async function listTrainingsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Training>> {
  await delay();
  maybeFail("listTrainingsAdmin");

  let rows = mockDb.trainings.slice();
  if (!opts.includeDrafts && opts.status) {
    rows = rows.filter((t) => t.status === opts.status);
  } else if (!opts.includeDrafts) {
    // no explicit status filter requested — admin sees everything by
    // default when includeDrafts is unset here (AdminListOptions has no
    // separate public/draft split; opts.status is the explicit filter).
  }
  if (opts.q) {
    rows = rows.filter((t) => matchesQuery(opts.q!, t.title, t.excerpt, t.slug));
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function getTraining(slug: string): Promise<Training | null> {
  await delay();
  maybeFail("getTraining");

  const row = mockDb.trainings.find((t) => t.slug === slug);
  if (!row) return null;
  // instructors are already nested/resolved at fixture-build time and kept
  // in sync via saveTraining below — no join left to the caller.
  //
  // `blocks` is normalised because the fixtures predate migration 20 and
  // some omit the field entirely, while the schema declares it
  // `.default([])` and every caller reads `training.blocks.length`
  // unguarded. Returning the raw row let `undefined` through and crashed
  // the training page during a mock-mode build.
  return { ...row, blocks: row.blocks ?? [] };
}

async function saveTraining(input: Partial<Training> & { id?: string }): Promise<Training> {
  await delay();
  maybeFail("saveTraining");

  const existing = input.id ? mockDb.trainings.find((t) => t.id === input.id) : undefined;

  // Resolve instructors nested-by-id if caller passed ids instead of full
  // lecturer objects (the interface types `instructors` as `Lecturer[]`
  // via `Partial<Training>`, but an admin form more naturally submits ids —
  // support both shapes defensively).
  let instructors = input.instructors ?? existing?.instructors ?? [];
  if (Array.isArray(instructors) && instructors.length > 0 && typeof instructors[0] === "string") {
    const ids = instructors as unknown as string[];
    instructors = ids
      .map((id) => mockDb.lecturers.find((l) => l.id === id))
      .filter((l): l is Lecturer => Boolean(l));
  }

  const merged: Training = {
    ...(existing ?? ({} as Training)),
    ...input,
    instructors,
    id: existing?.id ?? input.id ?? newId(),
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Training;

  const parsed = trainingSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.trainings.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteTraining(id: string): Promise<void> {
  await delay();
  maybeFail("deleteTraining");
  mockDb.trainings = mockDb.trainings.filter((t) => t.id !== id);
  persist();
}

/** Mock counterpart of the Supabase `page_blocks.training_id` query. Blocks
 * live on the training record itself here, since the mock store has no
 * separate page_blocks collection. */
async function getTrainingBlocksAdmin(trainingId: string): Promise<PageBlock[]> {
  await delay();
  maybeFail("getTrainingBlocksAdmin");
  const training = mockDb.trainings.find((t) => t.id === trainingId);
  return [...(training?.blocks ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

async function saveTrainingBlocks(trainingId: string, blocks: PageBlock[]): Promise<void> {
  await delay();
  maybeFail("saveTrainingBlocks");
  const training = mockDb.trainings.find((t) => t.id === trainingId);
  if (!training) return;
  training.blocks = blocks.map((b, i) => ({ ...b, training_id: trainingId, sort_order: i + 1 }));
  persist();
}

// ---------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------

async function listLecturers(opts: { visibleOnly?: boolean } = {}): Promise<Lecturer[]> {
  await delay();
  maybeFail("listLecturers");

  let rows = mockDb.lecturers.slice();
  if (opts.visibleOnly) {
    rows = rows.filter((l) => l.is_visible);
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return rows;
}

async function listLecturersAdmin(opts: AdminListOptions = {}): Promise<Paginated<Lecturer>> {
  await delay();
  maybeFail("listLecturersAdmin");

  let rows = mockDb.lecturers.slice();
  if (opts.q) {
    rows = rows.filter((l) => matchesQuery(opts.q!, l.name, l.role, l.bio));
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function getLecturer(idOrSlug: string): Promise<Lecturer | null> {
  await delay();
  maybeFail("getLecturer");
  return (
    mockDb.lecturers.find((l) => l.id === idOrSlug || l.page_slug === idOrSlug) ?? null
  );
}

/**
 * §5.5 / §8 consent-gated de-placeholdering, mirrored here for lecturers
 * exactly as for testimonials (see saveTestimonial below for the full
 * rationale comment — kept once there to avoid duplication drift; the
 * behavior is identical: save always de-placeholders; if the row is about
 * to become non-placeholder and would be visible without consent on file,
 * force is_visible = false rather than throwing, and report it via the
 * `warning` field so the (future, Phase 4) Server Action layer can surface
 * the Hebrew message from §8.
 */
async function saveLecturer(
  input: Partial<Lecturer> & { id?: string },
): Promise<Lecturer & { __consentWarning?: boolean }> {
  await delay();
  maybeFail("saveLecturer");

  const existing = input.id ? mockDb.lecturers.find((l) => l.id === input.id) : undefined;
  const willBePlaceholder = false; // saving through the CMS always de-placeholders

  let is_visible = input.is_visible ?? existing?.is_visible ?? false;
  const consent_on_file = input.consent_on_file ?? existing?.consent_on_file ?? false;

  let consentWarning = false;
  if (!willBePlaceholder && is_visible && !consent_on_file) {
    is_visible = false;
    consentWarning = true;
  }

  const merged: Lecturer = {
    ...(existing ?? ({} as Lecturer)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_visible,
    consent_on_file,
    is_placeholder: willBePlaceholder,
    // is_featured presupposes is_visible (CHECK constraint mirrored via
    // zod .refine below) — if visibility was just forced off by the
    // consent gate, featured must follow it off too, or `.parse()` throws.
    is_featured: is_visible ? (input.is_featured ?? existing?.is_featured ?? false) : false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Lecturer;

  const parsed = lecturerSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.lecturers.push(parsed);
  }
  persist();

  // __consentWarning is an ADDITIVE, non-schema field so the Phase-4 Server
  // Action can detect "saved but forced hidden" without a separate lookup.
  // See friction note in the final report re: whether this belongs on the
  // DataSource return type itself.
  return consentWarning ? { ...parsed, __consentWarning: true } : parsed;
}

async function deleteLecturer(id: string): Promise<void> {
  await delay();
  maybeFail("deleteLecturer");
  mockDb.lecturers = mockDb.lecturers.filter((l) => l.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------

async function listTestimonials(opts: { visibleOnly?: boolean } = {}): Promise<Testimonial[]> {
  await delay();
  maybeFail("listTestimonials");

  let rows = mockDb.testimonials.slice();
  if (opts.visibleOnly) {
    rows = rows.filter((t) => t.is_visible);
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return rows;
}

async function listTestimonialsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Testimonial>> {
  await delay();
  maybeFail("listTestimonialsAdmin");

  let rows = mockDb.testimonials.slice();
  if (opts.q) {
    rows = rows.filter((t) => matchesQuery(opts.q!, t.author_name, t.quote));
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

/**
 * §5.5 "Critical business logic" / §8 consent-gated de-placeholdering.
 *
 * Saving ALWAYS sets is_placeholder = false (self-clearing rule — the
 * admin never manages this flag directly, editing content is what
 * de-placeholders it).
 *
 * If, as a result, the row is a REAL (non-placeholder) row, and it would
 * be visible (`is_visible: true`) while `consent_on_file` is falsy, the
 * §6 CHECK constraint this schema mirrors
 * (`is_placeholder OR NOT is_visible OR consent_on_file`) would reject the
 * write outright. §8 says the admin must NEVER see that constraint fire as
 * a raw error — the Server Action (Phase 4, not built here) is supposed to
 * prevent ever hitting it. Per the task brief, the DECISION for this mock
 * layer is:
 *   - do NOT throw
 *   - force `is_visible = false` before validating/persisting
 *   - return a signal (`__consentWarning: true`, an additive field not on
 *     the `Testimonial` zod shape) so whoever wires up the real Server
 *     Action in Phase 4 can show the exact Hebrew copy from §8:
 *     "ההמלצה נשמרה כמוסתרת. לא ניתן להציג המלצה של אדם אמיתי ללא אישור
 *     בכתב. סמנו את אישור ההסכמה כדי להציג אותה."
 * This keeps `.parse()` always passing (never silently writing an
 * unvalidated row) while producing the exact behavior §8's acceptance test
 * describes: "assert the row saves, assert is_visible = false, assert the
 * Hebrew message is shown" — the last part is the Server Action's job, but
 * the flag it needs to know to show it is produced right here.
 */
async function saveTestimonial(
  input: Partial<Testimonial> & { id?: string },
): Promise<Testimonial & { __consentWarning?: boolean }> {
  await delay();
  maybeFail("saveTestimonial");

  const existing = input.id ? mockDb.testimonials.find((t) => t.id === input.id) : undefined;

  let is_visible = input.is_visible ?? existing?.is_visible ?? false;
  const consent_on_file = input.consent_on_file ?? existing?.consent_on_file ?? false;

  let consentWarning = false;
  if (is_visible && !consent_on_file) {
    is_visible = false;
    consentWarning = true;
  }

  const merged: Testimonial = {
    ...(existing ?? ({} as Testimonial)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_visible,
    consent_on_file,
    is_placeholder: false, // self-clearing (§5.5)
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Testimonial;

  const parsed = testimonialSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.testimonials.push(parsed);
  }
  persist();

  return consentWarning ? { ...parsed, __consentWarning: true } : parsed;
}

async function deleteTestimonial(id: string): Promise<void> {
  await delay();
  maybeFail("deleteTestimonial");
  mockDb.testimonials = mockDb.testimonials.filter((t) => t.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Program stages + steps
// ---------------------------------------------------------------------

async function getProgramStages(): Promise<ProgramStage[]> {
  await delay();
  maybeFail("getProgramStages");

  reindexProgramStages(mockDb); // steps nested fresh, mirroring the SQL join
  return mockDb.programStages.slice().sort((a, b) => a.sort_order - b.sort_order);
}

async function saveProgramStage(
  input: Partial<ProgramStage> & { id?: string },
): Promise<ProgramStage> {
  await delay();
  maybeFail("saveProgramStage");

  const existing = input.id ? mockDb.programStages.find((s) => s.id === input.id) : undefined;
  const id = existing?.id ?? input.id ?? newId();

  // Steps are a separately-persisted collection (see lib/mock/store.ts);
  // if the caller included `steps` in the input, upsert each into
  // mockDb.programSteps with this stage's id, then re-derive nesting.
  if (input.steps) {
    for (const step of input.steps) {
      const stepExisting = mockDb.programSteps.find((s) => s.id === step.id);
      const stepMerged = {
        ...(stepExisting ?? {}),
        ...step,
        id: stepExisting?.id ?? step.id ?? newId(),
        stage_id: id,
        is_placeholder: false,
        created_at: stepExisting?.created_at ?? nowIso(),
        updated_at: nowIso(),
      };
      if (stepExisting) {
        Object.assign(stepExisting, stepMerged);
      } else {
        mockDb.programSteps.push(stepMerged);
      }
    }
  }

  const merged: ProgramStage = {
    ...(existing ?? ({} as ProgramStage)),
    ...input,
    id,
    steps: [], // placeholder, re-derived by reindexProgramStages below
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as ProgramStage;

  if (existing) {
    Object.assign(existing, merged);
  } else {
    mockDb.programStages.push(merged);
  }
  reindexProgramStages(mockDb);
  const saved = mockDb.programStages.find((s) => s.id === id)!;
  const parsed = programStageSchema.parse(saved);
  persist();
  return parsed;
}

async function deleteProgramStage(id: string): Promise<void> {
  await delay();
  maybeFail("deleteProgramStage");
  mockDb.programStages = mockDb.programStages.filter((s) => s.id !== id);
  mockDb.programSteps = mockDb.programSteps.filter((s) => s.stage_id !== id);
  persist();
}

async function deleteProgramStep(stageId: string, stepId: string): Promise<void> {
  await delay();
  maybeFail("deleteProgramStep");
  mockDb.programSteps = mockDb.programSteps.filter(
    (s) => !(s.id === stepId && s.stage_id === stageId),
  );
  reindexProgramStages(mockDb);
  persist();
}

// ---------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------

async function listScheduleEntries(opts: { visibleOnly?: boolean } = {}): Promise<ScheduleEntry[]> {
  await delay();
  maybeFail("listScheduleEntries");

  let rows = mockDb.scheduleEntries.slice();
  if (opts.visibleOnly) {
    rows = rows.filter((s) => s.is_visible);
  }
  rows.sort((a, b) => a.sort_order - b.sort_order);
  return rows;
}

async function saveScheduleEntry(
  input: Partial<ScheduleEntry> & { id?: string },
): Promise<ScheduleEntry> {
  await delay();
  maybeFail("saveScheduleEntry");

  const existing = input.id ? mockDb.scheduleEntries.find((s) => s.id === input.id) : undefined;
  const merged: ScheduleEntry = {
    ...(existing ?? ({} as ScheduleEntry)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as ScheduleEntry;

  const parsed = scheduleEntrySchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.scheduleEntries.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteScheduleEntry(id: string): Promise<void> {
  await delay();
  maybeFail("deleteScheduleEntry");
  mockDb.scheduleEntries = mockDb.scheduleEntries.filter((s) => s.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Galleries
// ---------------------------------------------------------------------

async function listGalleries(): Promise<Gallery[]> {
  await delay();
  maybeFail("listGalleries");
  return mockDb.galleries.slice();
}

async function getGallery(slug: string): Promise<Gallery | null> {
  await delay();
  maybeFail("getGallery");
  return mockDb.galleries.find((g) => g.slug === slug) ?? null;
}

async function saveGallery(input: Partial<Gallery> & { id?: string }): Promise<Gallery> {
  await delay();
  maybeFail("saveGallery");

  const existing = input.id ? mockDb.galleries.find((g) => g.id === input.id) : undefined;
  const merged: Gallery = {
    ...(existing ?? ({} as Gallery)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    images: input.images ?? existing?.images ?? [],
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Gallery;

  const parsed = gallerySchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.galleries.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteGallery(id: string): Promise<void> {
  await delay();
  maybeFail("deleteGallery");
  mockDb.galleries = mockDb.galleries.filter((g) => g.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Podcast
// ---------------------------------------------------------------------

async function listPodcastEpisodes(): Promise<PodcastEpisode[]> {
  await delay();
  maybeFail("listPodcastEpisodes");
  return mockDb.podcastEpisodes
    .slice()
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
}

async function savePodcastEpisode(
  input: Partial<PodcastEpisode> & { id?: string },
): Promise<PodcastEpisode> {
  await delay();
  maybeFail("savePodcastEpisode");

  const existing = input.id
    ? mockDb.podcastEpisodes.find((p) => p.id === input.id)
    : undefined;
  const merged: PodcastEpisode = {
    ...(existing ?? ({} as PodcastEpisode)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as PodcastEpisode;

  const parsed = podcastEpisodeSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.podcastEpisodes.push(parsed);
  }
  persist();
  return parsed;
}

async function deletePodcastEpisode(id: string): Promise<void> {
  await delay();
  maybeFail("deletePodcastEpisode");
  mockDb.podcastEpisodes = mockDb.podcastEpisodes.filter((p) => p.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------

async function listMedia(opts: AdminListOptions = {}): Promise<Paginated<Media>> {
  await delay();
  maybeFail("listMedia");

  let rows = mockDb.media.slice();
  if (opts.q) {
    rows = rows.filter((m) => matchesQuery(opts.q!, m.alt_he, m.storage_path));
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 30);
}

async function getMedia(id: string): Promise<Media | null> {
  await delay();
  maybeFail("getMedia");
  return mockDb.media.find((m) => m.id === id) ?? null;
}

async function saveMedia(input: Partial<Media> & { id?: string }): Promise<Media> {
  await delay();
  maybeFail("saveMedia");

  const existing = input.id ? mockDb.media.find((m) => m.id === input.id) : undefined;
  const merged: Media = {
    ...(existing ?? ({} as Media)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Media;

  const parsed = mediaSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.media.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteMedia(id: string): Promise<void> {
  await delay();
  maybeFail("deleteMedia");
  mockDb.media = mockDb.media.filter((m) => m.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------

async function getMenu(location: MenuLocation): Promise<MenuItem[]> {
  await delay();
  maybeFail("getMenu");
  // Already stored as a resolved nested tree (see lib/mock/fixtures/menus.ts
  // and the MockDb.menus shape) — no join left to the caller.
  return mockDb.menus[location]?.slice() ?? [];
}

function findMenuItem(items: MenuItem[], id: string): MenuItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = findMenuItem(item.children, id);
    if (found) return found;
  }
  return undefined;
}

function removeMenuItem(items: MenuItem[], id: string): boolean {
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    return true;
  }
  for (const item of items) {
    if (removeMenuItem(item.children, id)) return true;
  }
  return false;
}

async function saveMenuItem(
  location: MenuLocation,
  item: Partial<MenuItem> & { id?: string; parent_id?: string | null },
): Promise<MenuItem> {
  await delay();
  maybeFail("saveMenuItem");

  const tree = mockDb.menus[location] ?? (mockDb.menus[location] = []);
  const id = item.id ?? newId();
  const existing = findMenuItem(tree, id);

  const saved: MenuItem = {
    id,
    label: item.label ?? existing?.label ?? "",
    href: item.href ?? existing?.href ?? "",
    sort_order: item.sort_order ?? existing?.sort_order ?? tree.length + 1,
    open_in_new_tab: item.open_in_new_tab ?? existing?.open_in_new_tab ?? false,
    children: existing?.children ?? [],
  };

  if (existing) {
    Object.assign(existing, saved);
  } else if (item.parent_id) {
    const parent = findMenuItem(tree, item.parent_id);
    if (parent) {
      parent.children.push(saved);
    } else {
      tree.push(saved);
    }
  } else {
    tree.push(saved);
  }
  persist();
  return saved;
}

async function deleteMenuItem(id: string): Promise<void> {
  await delay();
  maybeFail("deleteMenuItem");
  for (const location of Object.keys(mockDb.menus) as MenuLocation[]) {
    removeMenuItem(mockDb.menus[location], id);
  }
  persist();
}

async function reorderMenuItems(location: MenuLocation, orderedIds: string[]): Promise<void> {
  await delay();
  maybeFail("reorderMenuItems");

  const tree = mockDb.menus[location];
  if (!tree) return;
  orderedIds.forEach((id, index) => {
    const item = findMenuItem(tree, id);
    if (item) item.sort_order = index + 1;
  });
  tree.sort((a, b) => a.sort_order - b.sort_order);
  persist();
}

// ---------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------

async function getSiteSettings(): Promise<SiteSettings> {
  await delay();
  maybeFail("getSiteSettings");
  return mockDb.siteSettings;
}

async function saveSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
  await delay();
  maybeFail("saveSiteSettings");

  const merged: SiteSettings = {
    ...mockDb.siteSettings,
    ...input,
    updated_at: nowIso(),
  };
  const parsed = siteSettingsSchema.parse(merged);
  Object.assign(mockDb.siteSettings, parsed);
  persist();
  return parsed;
}

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------

async function search(q: string): Promise<SearchResult[]> {
  await delay();
  maybeFail("search");

  const now = nowIso();
  const results: SearchResult[] = [];

  for (const p of mockDb.posts) {
    if (!isPublicPost(p, now)) continue;
    if (matchesQuery(q, p.title, p.excerpt, p.body)) {
      results.push({ type: "post", slug: p.slug, title: p.title, excerpt: p.excerpt });
    }
  }
  for (const t of mockDb.trainings) {
    if (t.status !== "published") continue;
    if (matchesQuery(q, t.title, t.excerpt, t.body)) {
      results.push({ type: "training", slug: t.slug, title: t.title, excerpt: t.excerpt });
    }
  }
  for (const pg of mockDb.pages) {
    if (pg.status !== "published") continue;
    if (matchesQuery(q, pg.title)) {
      results.push({ type: "page", slug: pg.slug, title: pg.title, excerpt: null });
    }
  }
  return results;
}

// ---------------------------------------------------------------------
// Study years (studies-hub sub-pages) — see the DataSource interface's
// own comment on `listStudyYears` for the judgment-call reasoning.
// ---------------------------------------------------------------------

async function listStudyYears() {
  await delay();
  maybeFail("listStudyYears");
  return studyYears;
}

// ---------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------

async function getPage(slug: string): Promise<Page | null> {
  await delay();
  maybeFail("getPage");

  const row = mockDb.pages.find((p) => p.slug === slug);
  if (!row) return null;
  if (row.status !== "published") return null;
  // Blocks are filtered to visible-only and sorted here — never left to a
  // component to filter/sort (§5.5 rule 3 applies to page_blocks too).
  return {
    ...row,
    blocks: resolveSharedBlocksMock(
      row.blocks
        .filter((b) => b.is_visible)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    ),
  };
}

async function listPages(opts: AdminListOptions = {}): Promise<Paginated<Page>> {
  await delay();
  maybeFail("listPages");

  let rows = mockDb.pages.slice();
  if (!opts.includeDrafts && opts.status) {
    rows = rows.filter((p) => p.status === opts.status);
  }
  if (opts.q) {
    rows = rows.filter((p) => matchesQuery(opts.q!, p.title, p.slug));
  }
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function savePage(input: PageInput): Promise<Page> {
  await delay();
  maybeFail("savePage");

  const validatedInput = pageInputSchema.parse(input);
  const existing = validatedInput.id
    ? mockDb.pages.find((p) => p.id === validatedInput.id)
    : undefined;

  const merged: Page = {
    ...(existing ?? ({} as Page)),
    ...validatedInput,
    id: existing?.id ?? validatedInput.id ?? newId(),
    is_placeholder: false,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Page;

  const parsed = pageSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.pages.push(parsed);
  }
  persist();
  return parsed;
}

async function deletePage(id: string): Promise<void> {
  await delay();
  maybeFail("deletePage");
  mockDb.pages = mockDb.pages.filter((p) => p.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Public writes (leads / newsletter / contact) — Server Actions Phase 4
// ---------------------------------------------------------------------

async function createLead(input: LeadInput): Promise<{ id: string }> {
  await delay();
  maybeFail("createLead");

  const row: Lead = {
    ...input,
    id: newId(),
    status: "new",
    notes: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const parsed = leadSchema.parse(row);
  mockDb.leads.push(parsed);
  persist();
  return { id: parsed.id };
}

async function subscribeNewsletter(
  input: NewsletterSubscribeInput,
): Promise<{ id: string }> {
  await delay();
  maybeFail("subscribeNewsletter");

  const existing = mockDb.newsletterSubscribers.find((s) => s.email === input.email);
  if (existing) {
    existing.status = "subscribed";
    existing.consent_at = input.consent_at;
    existing.source = input.source;
    existing.updated_at = nowIso();
    persist();
    return { id: existing.id };
  }

  const row: NewsletterSubscriber = {
    ...input,
    id: newId(),
    status: "subscribed",
    unsubscribe_token: newId(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const parsed = newsletterSubscriberSchema.parse(row);
  mockDb.newsletterSubscribers.push(parsed);
  persist();
  return { id: parsed.id };
}

async function unsubscribeNewsletter(token: string): Promise<void> {
  await delay();
  maybeFail("unsubscribeNewsletter");

  const row = mockDb.newsletterSubscribers.find((s) => s.unsubscribe_token === token);
  if (row) {
    row.status = "unsubscribed";
    row.updated_at = nowIso();
    persist();
  }
}

async function createContactMessage(
  input: ContactMessageInput,
): Promise<{ id: string }> {
  await delay();
  maybeFail("createContactMessage");

  const row: ContactMessage = {
    ...input,
    id: newId(),
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const parsed = contactMessageSchema.parse(row);
  mockDb.contactMessages.push(parsed);
  persist();
  return { id: parsed.id };
}

// ---------------------------------------------------------------------
// Admin: captured data lists
// ---------------------------------------------------------------------

async function listLeadsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Lead>> {
  await delay();
  maybeFail("listLeadsAdmin");

  let rows = mockDb.leads.slice();
  if (opts.status) {
    rows = rows.filter((l) => l.status === opts.status);
  }
  if (opts.q) {
    rows = rows.filter((l) => matchesQuery(opts.q!, l.first_name, l.last_name, l.email, l.phone));
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function listNewsletterSubscribersAdmin(
  opts: AdminListOptions = {},
): Promise<Paginated<NewsletterSubscriber>> {
  await delay();
  maybeFail("listNewsletterSubscribersAdmin");

  let rows = mockDb.newsletterSubscribers.slice();
  if (opts.status) {
    rows = rows.filter((s) => s.status === opts.status);
  }
  if (opts.q) {
    rows = rows.filter((s) => matchesQuery(opts.q!, s.email));
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function listContactMessagesAdmin(
  opts: AdminListOptions = {},
): Promise<Paginated<ContactMessage>> {
  await delay();
  maybeFail("listContactMessagesAdmin");

  let rows = mockDb.contactMessages.slice();
  if (opts.q) {
    rows = rows.filter((c) => matchesQuery(opts.q!, c.name, c.email, c.message));
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 20);
}

async function saveLead(input: { id: string; status?: string; notes?: string | null }): Promise<Lead> {
  await delay();
  maybeFail("saveLead");

  const existing = mockDb.leads.find((l) => l.id === input.id);
  if (!existing) {
    throw new Error("הליד המבוקש לא נמצא.");
  }
  const merged: Lead = {
    ...existing,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    updated_at: nowIso(),
  } as Lead;

  const parsed = leadSchema.parse(merged);
  Object.assign(existing, parsed);
  persist();
  return parsed;
}

async function saveNewsletterSubscriber(input: { id: string; status: string }): Promise<NewsletterSubscriber> {
  await delay();
  maybeFail("saveNewsletterSubscriber");

  const existing = mockDb.newsletterSubscribers.find((s) => s.id === input.id);
  if (!existing) {
    throw new Error("הרשומה המבוקשת לא נמצאה.");
  }
  const merged: NewsletterSubscriber = {
    ...existing,
    status: input.status,
    updated_at: nowIso(),
  } as NewsletterSubscriber;

  const parsed = newsletterSubscriberSchema.parse(merged);
  Object.assign(existing, parsed);
  persist();
  return parsed;
}

// ---------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------

async function listRedirectsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Redirect>> {
  await delay();
  maybeFail("listRedirectsAdmin");

  let rows = mockDb.redirects.slice();
  if (opts.q) {
    rows = rows.filter((r) => matchesQuery(opts.q!, r.from_path, r.to_path));
  }
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 50);
}

async function saveRedirect(input: Partial<Redirect> & { id?: string }): Promise<Redirect> {
  await delay();
  maybeFail("saveRedirect");

  const existing = input.id ? mockDb.redirects.find((r) => r.id === input.id) : undefined;
  const merged: Redirect = {
    ...(existing ?? ({} as Redirect)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Redirect;

  const parsed = redirectSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.redirects.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteRedirect(id: string): Promise<void> {
  await delay();
  maybeFail("deleteRedirect");
  mockDb.redirects = mockDb.redirects.filter((r) => r.id !== id);
  persist();
}

// ---------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------

async function listUsersAdmin(opts: AdminListOptions = {}): Promise<Paginated<Profile>> {
  await delay();
  maybeFail("listUsersAdmin");

  let rows = mockDb.profiles.slice();
  if (opts.q) {
    rows = rows.filter((p) => matchesQuery(opts.q!, p.full_name, p.email));
  }
  if (opts.status === "active") {
    rows = rows.filter((p) => p.is_active);
  } else if (opts.status === "inactive") {
    rows = rows.filter((p) => !p.is_active);
  }
  rows.sort((a, b) => a.full_name.localeCompare(b.full_name, "he"));
  return paginate(rows, opts.page ?? 1, opts.perPage ?? 50);
}

/**
 * §8 Users screen "invite, set role, deactivate." One method covers all
 * three the same way `saveScheduleEntry`/etc. cover create+update — see the
 * Server Action layer (app/(admin)/admin/users/actions.ts) for the explicit
 * framing that "invite" here creates a `profiles` row directly and does
 * NOT send a real email or create a real Supabase Auth account (no such
 * backend exists before Phase 5).
 */
async function saveUser(input: Partial<Profile> & { id?: string }): Promise<Profile> {
  await delay();
  maybeFail("saveUser");

  const existing = input.id ? mockDb.profiles.find((p) => p.id === input.id) : undefined;
  const merged: Profile = {
    ...(existing ?? ({} as Profile)),
    ...input,
    id: existing?.id ?? input.id ?? newId(),
    is_active: input.is_active ?? existing?.is_active ?? true,
    avatar_id: input.avatar_id ?? existing?.avatar_id ?? null,
    created_at: existing?.created_at ?? nowIso(),
    updated_at: nowIso(),
  } as Profile;

  const parsed = profileSchema.parse(merged);
  if (existing) {
    Object.assign(existing, parsed);
  } else {
    mockDb.profiles.push(parsed);
  }
  persist();
  return parsed;
}

async function deleteUser(id: string): Promise<void> {
  await delay();
  maybeFail("deleteUser");
  mockDb.profiles = mockDb.profiles.filter((p) => p.id !== id);
  persist();
}

// ---------------------------------------------------------------------

export const mockDataSource: DataSource = {
  getPage,
  listPages,
  savePage,
  deletePage,

  listPosts,
  getPost,
  getPostAdmin,
  savePost,
  deletePost,

  listCategories,
  getCategory,
  saveCategory,
  deleteCategory,

  listTrainings,
  listTrainingsAdmin,
  getTraining,
  saveTraining,
  deleteTraining,
  getTrainingBlocksAdmin,
  saveTrainingBlocks,
  listSharedBlocks,
  getSharedBlock,
  saveSharedBlock,
  deleteSharedBlock,

  listLecturers,
  listLecturersAdmin,
  getLecturer,
  saveLecturer,
  deleteLecturer,

  listTestimonials,
  listTestimonialsAdmin,
  saveTestimonial,
  deleteTestimonial,

  getProgramStages,
  saveProgramStage,
  deleteProgramStage,
  deleteProgramStep,

  listScheduleEntries,
  saveScheduleEntry,
  deleteScheduleEntry,

  listGalleries,
  getGallery,
  saveGallery,
  deleteGallery,

  listPodcastEpisodes,
  savePodcastEpisode,
  deletePodcastEpisode,

  listMedia,
  getMedia,
  saveMedia,
  deleteMedia,

  getMenu,
  saveMenuItem,
  deleteMenuItem,
  reorderMenuItems,

  getSiteSettings,
  saveSiteSettings,

  search,

  listStudyYears,

  createLead,
  subscribeNewsletter,
  unsubscribeNewsletter,
  createContactMessage,

  listLeadsAdmin,
  listNewsletterSubscribersAdmin,
  listContactMessagesAdmin,
  saveLead,
  saveNewsletterSubscriber,

  listRedirectsAdmin,
  saveRedirect,
  deleteRedirect,

  listUsersAdmin,
  saveUser,
  deleteUser,
};
