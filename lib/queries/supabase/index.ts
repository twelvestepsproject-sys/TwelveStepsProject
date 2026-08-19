import "server-only";
import type {
  Page,
  PageInput,
  PageBlock,
  SharedBlock,
  PostSummary,
  Post,
  Training,
  Lecturer,
  Testimonial,
  ProgramStage,
  ProgramStep,
  ScheduleEntry,
  SiteSettings,
  MenuItem,
  MenuLocation,
  SearchResult,
  Category,
  Gallery,
  GalleryImage,
  PodcastEpisode,
  Media,
  Lead,
  LeadInput,
  NewsletterSubscriber,
  NewsletterSubscribeInput,
  ContactMessage,
  ContactMessageInput,
  Paginated,
  Redirect,
  Profile,
} from "@/lib/schemas";
import type {
  DataSource,
  ListPostsOptions,
  ListTrainingsOptions,
  AdminListOptions,
} from "@/lib/queries/types";
import { getClient, nowIso, throwIfError } from "./helpers";
import { studyYears } from "@/lib/mock/fixtures/study-years";

/**
 * lib/queries/supabase/index.ts — the real implementation of the
 * `DataSource` seam (§5.5 / Phase 5), method-for-method against
 * `lib/queries/mock/index.ts`. Every method goes through the request-scoped
 * `@supabase/ssr` client (`getClient()`), so every read/write is subject to
 * RLS (§7) exactly like any other authenticated or anonymous caller — no
 * service-role bypass here (see lib/supabase/admin.ts for the one narrow,
 * separately-flagged exception used elsewhere, not in this file).
 *
 * FRICTION NOTES (flagged per task brief rather than silently changing the
 * DataSource interface):
 *
 * 1. `listStudyYears()` — this was already flagged in types.ts as NOT a §6
 *    table (a Phase-3 judgment call). It still has no real backing table.
 *    Rather than inventing a table that was never asked for, this Supabase
 *    implementation returns the same static fixture the mock does. If the
 *    client wants this content DB-editable, that's a real (small) schema
 *    addition to propose separately, not something to improvise here.
 *
 * 2. `getPost(slug)` has no `includeDrafts` option on the interface (only
 *    `getPostAdmin(id)` does), so admin draft-preview-by-slug still isn't
 *    directly expressible — same friction the mock's comment already
 *    flags. Not fixed here since changing the interface wasn't authorized.
 *
 * 3. `saveTraining`'s instructor-id-or-object duck-typing (mirrored from
 *    the mock) is preserved: the m2m `training_instructors` join table is
 *    fully replaced (delete-then-reinsert) on every save rather than
 *    diffed, for simplicity and correctness — trainings have at most a
 *    handful of instructors so this is cheap.
 *
 * 4. `saveProgramStage({ steps })` — mirrors the mock's upsert-only (no
 *    delete-on-omit) semantics exactly, per the existing `deleteProgramStep`
 *    method's own doc comment explaining why that gap exists.
 *
 * 5. Pagination note: Supabase/PostgREST range-based pagination
 *    (`.range()`) combined with `{ count: 'exact' }` issues one query per
 *    call (count comes back on the same response) — no N+1 here.
 */

// ---------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------

function rowToPageBlock(row: {
  id: string;
  page_id?: string | null;
  training_id?: string | null;
  shared_block_id?: string | null;
  block_type: string;
  sort_order: number;
  is_visible: boolean;
  data: unknown;
}): PageBlock {
  return {
    id: row.id,
    page_id: row.page_id ?? null,
    training_id: row.training_id ?? null,
    shared_block_id: row.shared_block_id ?? null,
    sort_order: row.sort_order,
    is_visible: row.is_visible,
    block_type: row.block_type,
    data: row.data,
  } as PageBlock;
}

async function getPage(slug: string): Promise<Page | null> {
  const supabase = await getClient();
  const { data: page, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  throwIfError(error, "getPage");
  if (!page) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_id", page.id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  throwIfError(blocksError, "getPage blocks");

  return {
    ...page,
    blocks: await resolveSharedBlocks((blocks ?? []).map(rowToPageBlock)),
  } as Page;
}

async function listPages(opts: AdminListOptions = {}): Promise<Paginated<Page>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("pages").select("*", { count: "exact" });
  if (!opts.includeDrafts && opts.status) {
    query = query.eq("status", opts.status);
  }
  if (opts.q) {
    query = query.or(`title.ilike.%${opts.q}%,slug.ilike.%${opts.q}%`);
  }
  const { data, error, count } = await query.range(from, to);
  throwIfError(error, "listPages");

  const withBlocks = await Promise.all(
    (data ?? []).map(async (p) => {
      const { data: blocks } = await supabase
        .from("page_blocks")
        .select("*")
        .eq("page_id", p.id)
        .order("sort_order", { ascending: true });
      return { ...p, blocks: (blocks ?? []).map(rowToPageBlock) } as Page;
    }),
  );

  return { items: withBlocks, total: count ?? 0, page, perPage };
}

async function savePage(input: PageInput): Promise<Page> {
  const supabase = await getClient();
  const { blocks, id, ...pageFields } = input as PageInput & { id?: string };

  const payload = { ...pageFields, is_placeholder: false };

  let pageId = id;
  if (id) {
    const { data, error } = await supabase
      .from("pages")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    throwIfError(error, "savePage update");
    pageId = data!.id;
  } else {
    const { data, error } = await supabase.from("pages").insert(payload).select().single();
    throwIfError(error, "savePage insert");
    pageId = data!.id;
  }

  // Blocks: replace-all-on-save (delete then reinsert), same simplicity
  // tradeoff as training_instructors — see friction note #3 above.
  const { error: deleteError } = await supabase.from("page_blocks").delete().eq("page_id", pageId);
  throwIfError(deleteError, "savePage delete blocks");

  if (blocks && blocks.length > 0) {
    const blockRows = blocks.map((b) => {
      const sharedId = (b as { shared_block_id?: string | null }).shared_block_id ?? null;
      return {
        page_id: pageId,
        shared_block_id: sharedId,
        block_type: b.block_type,
        sort_order: b.sort_order,
        is_visible: b.is_visible,
        // A reference stores no content of its own — the source is the
        // single copy, so there is nothing here to drift out of sync.
        data: sharedId ? {} : b.data,
      };
    });
    const { error: insertError } = await supabase.from("page_blocks").insert(blockRows);
    throwIfError(insertError, "savePage insert blocks");
  }

  return getPageById(pageId!);
}

async function getPageById(id: string): Promise<Page> {
  const supabase = await getClient();
  const { data: page, error } = await supabase.from("pages").select("*").eq("id", id).single();
  throwIfError(error, "getPageById");
  const { data: blocks } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("page_id", id)
    .order("sort_order", { ascending: true });
  return { ...page, blocks: (blocks ?? []).map(rowToPageBlock) } as Page;
}

async function deletePage(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("pages").delete().eq("id", id);
  throwIfError(error, "deletePage");
}

// ---------------------------------------------------------------------
// Shared blocks (migration 24)
// ---------------------------------------------------------------------

/**
 * Replaces every reference row with the shared block's own content, so
 * callers downstream (renderers, the page editor) never need to know a
 * block was shared. One query for all referenced ids, not one per row.
 *
 * A reference whose source was deleted is dropped rather than rendered
 * empty — the FK cascades on delete, so this only guards against a race.
 */
async function resolveSharedBlocks(blocks: PageBlock[]): Promise<PageBlock[]> {
  const ids = blocks
    .map((b) => (b as { shared_block_id?: string | null }).shared_block_id)
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return blocks;

  const supabase = await getClient();
  const { data, error } = await supabase.from("shared_blocks").select("*").in("id", ids);
  throwIfError(error, "resolveSharedBlocks");

  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  return blocks
    .map((b) => {
      const sharedId = (b as { shared_block_id?: string | null }).shared_block_id;
      if (!sharedId) return b;
      const shared = byId.get(sharedId);
      if (!shared) return null;
      // Placement (sort_order, is_visible, owner) stays with the reference;
      // type and content come from the source.
      return { ...b, block_type: shared.block_type, data: shared.data } as PageBlock;
    })
    .filter((b): b is PageBlock => b !== null);
}

async function listSharedBlocks(): Promise<SharedBlock[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("shared_blocks")
    .select("*")
    .order("name", { ascending: true });
  throwIfError(error, "listSharedBlocks");
  return (data ?? []) as SharedBlock[];
}

async function getSharedBlock(id: string): Promise<SharedBlock | null> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("shared_blocks").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "getSharedBlock");
  return (data as SharedBlock | null) ?? null;
}

async function saveSharedBlock(
  input: Partial<SharedBlock> & { id?: string },
): Promise<SharedBlock> {
  const supabase = await getClient();
  const { id, created_at, updated_at, ...fields } = input as Record<string, unknown> & { id?: string };
  const query = id
    ? supabase.from("shared_blocks").update(fields).eq("id", id).select().single()
    : supabase.from("shared_blocks").insert(fields).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveSharedBlock");
  return data as SharedBlock;
}

async function deleteSharedBlock(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("shared_blocks").delete().eq("id", id);
  throwIfError(error, "deleteSharedBlock");
}


// ---------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------

function rowToPostSummary(row: any): PostSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image_id: row.cover_image_id,
    category: row.category ?? null,
    published_at: row.published_at,
    reading_time: row.reading_time,
  };
}

const POST_SELECT_WITH_CATEGORY = "*, category:categories(*)";

async function listPosts(opts: ListPostsOptions = {}): Promise<Paginated<PostSummary>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 10;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("posts").select(POST_SELECT_WITH_CATEGORY, { count: "exact" });

  if (!opts.includeDrafts) {
    // Two independent filters, both required (§5.5 rule 4 / §6) — RLS
    // enforces this for anon too, but the admin-mode client (editor+) isn't
    // filtered by RLS, so this app-level filter is what makes
    // includeDrafts:false behave correctly for a logged-in editor as well.
    query = query.eq("status", "published").lte("published_at", nowIso()).not("published_at", "is", null);
  }
  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    query = query.eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (opts.q) {
    query = query.or(`title.ilike.%${opts.q}%,excerpt.ilike.%${opts.q}%,slug.ilike.%${opts.q}%`);
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: false })
    .range(from, to);
  throwIfError(error, "listPosts");

  return { items: (data ?? []).map(rowToPostSummary), total: count ?? 0, page, perPage };
}

async function getPost(slug: string): Promise<Post | null> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_CATEGORY)
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", nowIso())
    .not("published_at", "is", null)
    .maybeSingle();
  throwIfError(error, "getPost");
  return (data as Post | null) ?? null;
}

async function getPostAdmin(id: string): Promise<Post | null> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT_WITH_CATEGORY)
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "getPostAdmin");
  return (data as Post | null) ?? null;
}

async function savePost(input: Partial<Post> & { id?: string }): Promise<Post> {
  const supabase = await getClient();
  const { id, category, ...fields } = input as any;
  const payload = { ...fields, is_placeholder: false };

  const query = id
    ? supabase.from("posts").update(payload).eq("id", id).select(POST_SELECT_WITH_CATEGORY).single()
    : supabase.from("posts").insert(payload).select(POST_SELECT_WITH_CATEGORY).single();

  const { data, error } = await query;
  throwIfError(error, "savePost");
  return data as Post;
}

async function deletePost(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  throwIfError(error, "deletePost");
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

async function listCategories(): Promise<Category[]> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("categories").select("*").order("name");
  throwIfError(error, "listCategories");
  return (data ?? []) as Category[];
}

async function getCategory(slug: string): Promise<Category | null> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  throwIfError(error, "getCategory");
  return (data as Category | null) ?? null;
}

async function saveCategory(input: Partial<Category> & { id?: string }): Promise<Category> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const payload = { ...fields, is_placeholder: false };
  const query = id
    ? supabase.from("categories").update(payload).eq("id", id).select().single()
    : supabase.from("categories").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveCategory");
  return data as Category;
}

async function deleteCategory(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  throwIfError(error, "deleteCategory");
}

// ---------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------

const TRAINING_SELECT =
  "*, training_instructors(sort_order, lecturer:lecturers(*))";

function rowToTraining(row: any): Training {
  // FRICTION FLAGGED (found via `pnpm build` crashing on a real fixture
  // combination — a training whose training_instructors includes a
  // lecturer with is_visible=false): the nested `lecturer:lecturers(*)`
  // embed is itself subject to `lecturers`' own RLS policy
  // (`lecturers_select_public`), independently of `training_instructors`'
  // policy (which only checks the training's status, not each linked
  // lecturer's visibility). For an anon/public caller this means
  // PostgREST returns the join row with `lecturer: null` rather than
  // omitting it — a real, DB-driven divergence from the mock, which never
  // applied per-row visibility filtering to nested instructors and so
  // never surfaced this. Filtering out unresolved (RLS-hidden) instructors
  // here is the behaviorally-correct fix: it's exactly what an anon site
  // visitor should see (a hidden lecturer shouldn't appear as an
  // instructor on a public training page), and it matches what
  // `listLecturers({ visibleOnly: true })` already enforces elsewhere.
  // An editor+/admin caller (RLS allows them to see every lecturer) never
  // hits this path since nothing resolves to null for them.
  const instructors = (row.training_instructors ?? [])
    .slice()
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((ti: any) => ti.lecturer)
    .filter((l: unknown): l is NonNullable<typeof l> => l !== null);
  const { training_instructors, ...rest } = row;
  // `blocks` defaults to [] for list queries, which don't fetch them —
  // only `getTraining` (the single-training page) needs the composition.
  return { ...rest, instructors, blocks: rest.blocks ?? [] } as Training;
}

async function listTrainings(opts: ListTrainingsOptions = {}): Promise<Training[]> {
  const supabase = await getClient();
  let query = supabase.from("trainings").select(TRAINING_SELECT);
  if (!opts.includeDrafts) {
    query = query.eq("status", "published");
  }
  if (opts.featuredOnly) {
    query = query.eq("is_featured", true);
  }
  const { data, error } = await query.order("sort_order", { ascending: true });
  throwIfError(error, "listTrainings");
  return (data ?? []).map(rowToTraining);
}

async function listTrainingsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Training>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from("trainings").select(TRAINING_SELECT, { count: "exact" });
  if (opts.status) {
    query = query.eq("status", opts.status);
  }
  if (opts.q) {
    query = query.or(`title.ilike.%${opts.q}%,excerpt.ilike.%${opts.q}%,slug.ilike.%${opts.q}%`);
  }
  const { data, error, count } = await query.order("sort_order", { ascending: true }).range(from, to);
  throwIfError(error, "listTrainingsAdmin");
  return { items: (data ?? []).map(rowToTraining), total: count ?? 0, page, perPage };
}

async function getTraining(slug: string): Promise<Training | null> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  throwIfError(error, "getTraining");
  if (!data) return null;

  // Blocks are a separate query rather than a nested embed: they live in
  // `page_blocks` (shared with pages, see migration 20) and need the same
  // is_visible + sort_order treatment `getPage` applies. Only the single
  // -training page needs them, so list queries don't pay for this.
  const { data: blocks, error: blocksError } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("training_id", (data as { id: string }).id)
    .eq("is_visible", true)
    .order("sort_order", { ascending: true });
  throwIfError(blocksError, "getTraining blocks");

  return rowToTraining({
    ...data,
    blocks: await resolveSharedBlocks((blocks ?? []).map(rowToPageBlock)),
  });
}

/** Admin variant: every block regardless of `is_visible`, so the editor can
 * see and re-enable hidden ones. */
async function getTrainingBlocksAdmin(trainingId: string): Promise<PageBlock[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("page_blocks")
    .select("*")
    .eq("training_id", trainingId)
    .order("sort_order", { ascending: true });
  throwIfError(error, "getTrainingBlocksAdmin");
  return (data ?? []).map(rowToPageBlock);
}

/** Replace-all-on-save, mirroring `savePage`'s handling of page blocks. */
async function saveTrainingBlocks(trainingId: string, blocks: PageBlock[]): Promise<void> {
  const supabase = await getClient();
  const { error: deleteError } = await supabase
    .from("page_blocks")
    .delete()
    .eq("training_id", trainingId);
  throwIfError(deleteError, "saveTrainingBlocks delete");

  if (blocks.length > 0) {
    const rows = blocks.map((b, i) => {
      const sharedId = (b as { shared_block_id?: string | null }).shared_block_id ?? null;
      return {
        training_id: trainingId,
        page_id: null,
        shared_block_id: sharedId,
        block_type: b.block_type,
        sort_order: i + 1,
        is_visible: b.is_visible,
        data: sharedId ? {} : b.data,
      };
    });
    const { error: insertError } = await supabase.from("page_blocks").insert(rows);
    throwIfError(insertError, "saveTrainingBlocks insert");
  }
}

async function saveTraining(input: Partial<Training> & { id?: string }): Promise<Training> {
  const supabase = await getClient();
  // `blocks` is a resolved relation (page_blocks rows), not a trainings
  // column — dropped here like `instructors`, or the update would fail on
  // an unknown column. Block edits go through `saveTrainingBlocks`.
  const { id, instructors, blocks, ...fields } = input as any;
  const payload = { ...fields, is_placeholder: false };

  let trainingId = id;
  if (id) {
    const { data, error } = await supabase.from("trainings").update(payload).eq("id", id).select().single();
    throwIfError(error, "saveTraining update");
    trainingId = data!.id;
  } else {
    const { data, error } = await supabase.from("trainings").insert(payload).select().single();
    throwIfError(error, "saveTraining insert");
    trainingId = data!.id;
  }

  if (instructors) {
    // Accept either full Lecturer objects or bare ids (mirrors the mock's
    // defensive duck-typing — see friction note #3).
    const ids: string[] = instructors.map((i: any) => (typeof i === "string" ? i : i.id));
    const { error: deleteError } = await supabase
      .from("training_instructors")
      .delete()
      .eq("training_id", trainingId);
    throwIfError(deleteError, "saveTraining delete instructors");
    if (ids.length > 0) {
      const rows = ids.map((lecturer_id, idx) => ({
        training_id: trainingId,
        lecturer_id,
        sort_order: idx,
      }));
      const { error: insertError } = await supabase.from("training_instructors").insert(rows);
      throwIfError(insertError, "saveTraining insert instructors");
    }
  }

  const { data: full, error: fullError } = await supabase
    .from("trainings")
    .select(TRAINING_SELECT)
    .eq("id", trainingId)
    .single();
  throwIfError(fullError, "saveTraining refetch");
  return rowToTraining(full);
}

async function deleteTraining(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("trainings").delete().eq("id", id);
  throwIfError(error, "deleteTraining");
}

// ---------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------

async function listLecturers(opts: { visibleOnly?: boolean } = {}): Promise<Lecturer[]> {
  const supabase = await getClient();
  let query = supabase.from("lecturers").select("*");
  if (opts.visibleOnly) {
    query = query.eq("is_visible", true);
  }
  const { data, error } = await query.order("sort_order", { ascending: true });
  throwIfError(error, "listLecturers");
  return (data ?? []) as Lecturer[];
}

async function listLecturersAdmin(opts: AdminListOptions = {}): Promise<Paginated<Lecturer>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("lecturers").select("*", { count: "exact" });
  if (opts.q) {
    query = query.or(`name.ilike.%${opts.q}%,role.ilike.%${opts.q}%,bio.ilike.%${opts.q}%`);
  }
  const { data, error, count } = await query.order("sort_order", { ascending: true }).range(from, to);
  throwIfError(error, "listLecturersAdmin");
  return { items: (data ?? []) as Lecturer[], total: count ?? 0, page, perPage };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getLecturer(idOrSlug: string): Promise<Lecturer | null> {
  const supabase = await getClient();
  // PostgREST throws (not just "no match") on `id.eq.<non-uuid>` since `id`
  // is a uuid column — guard with a format check before including that
  // clause, rather than always sending both (mirrors the mock's permissive
  // `id === idOrSlug || page_slug === idOrSlug` which never throws).
  const filter = UUID_RE.test(idOrSlug)
    ? `id.eq.${idOrSlug},page_slug.eq.${idOrSlug}`
    : `page_slug.eq.${idOrSlug}`;
  const { data, error } = await supabase.from("lecturers").select("*").or(filter).maybeSingle();
  throwIfError(error, "getLecturer");
  return (data as Lecturer | null) ?? null;
}

/** Consent-gated de-placeholdering (§5.5/§8), mirrored exactly from the
 * mock: force is_visible=false rather than letting the DB CHECK constraint
 * reject the write, and surface __consentWarning so the Server Action can
 * show the Hebrew copy. See lib/queries/mock/index.ts's saveLecturer for
 * the full rationale (kept once there to avoid duplication drift). */
async function saveLecturer(
  input: Partial<Lecturer> & { id?: string },
): Promise<Lecturer & { __consentWarning?: boolean }> {
  const supabase = await getClient();
  const { id, ...fields } = input as any;

  let existing: Lecturer | null = null;
  if (id) {
    const { data } = await supabase.from("lecturers").select("*").eq("id", id).maybeSingle();
    existing = data as Lecturer | null;
  }

  let is_visible = fields.is_visible ?? existing?.is_visible ?? false;
  const consent_on_file = fields.consent_on_file ?? existing?.consent_on_file ?? false;

  let consentWarning = false;
  if (is_visible && !consent_on_file) {
    is_visible = false;
    consentWarning = true;
  }
  const is_featured = is_visible ? (fields.is_featured ?? existing?.is_featured ?? false) : false;

  const payload = {
    ...fields,
    is_visible,
    consent_on_file,
    is_featured,
    is_placeholder: false,
  };

  const query = id
    ? supabase.from("lecturers").update(payload).eq("id", id).select().single()
    : supabase.from("lecturers").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveLecturer");

  return consentWarning ? { ...(data as Lecturer), __consentWarning: true } : (data as Lecturer);
}

async function deleteLecturer(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("lecturers").delete().eq("id", id);
  throwIfError(error, "deleteLecturer");
}

// ---------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------

async function listTestimonials(opts: { visibleOnly?: boolean } = {}): Promise<Testimonial[]> {
  const supabase = await getClient();
  let query = supabase.from("testimonials").select("*");
  if (opts.visibleOnly) {
    query = query.eq("is_visible", true);
  }
  const { data, error } = await query.order("sort_order", { ascending: true });
  throwIfError(error, "listTestimonials");
  return (data ?? []) as Testimonial[];
}

async function listTestimonialsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Testimonial>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("testimonials").select("*", { count: "exact" });
  if (opts.q) {
    query = query.or(`author_name.ilike.%${opts.q}%,quote.ilike.%${opts.q}%`);
  }
  const { data, error, count } = await query.order("sort_order", { ascending: true }).range(from, to);
  throwIfError(error, "listTestimonialsAdmin");
  return { items: (data ?? []) as Testimonial[], total: count ?? 0, page, perPage };
}

/** Consent-gated de-placeholdering — identical shape to saveLecturer. See
 * lib/queries/mock/index.ts's saveTestimonial for the full rationale. */
async function saveTestimonial(
  input: Partial<Testimonial> & { id?: string },
): Promise<Testimonial & { __consentWarning?: boolean }> {
  const supabase = await getClient();
  const { id, ...fields } = input as any;

  let existing: Testimonial | null = null;
  if (id) {
    const { data } = await supabase.from("testimonials").select("*").eq("id", id).maybeSingle();
    existing = data as Testimonial | null;
  }

  let is_visible = fields.is_visible ?? existing?.is_visible ?? false;
  const consent_on_file = fields.consent_on_file ?? existing?.consent_on_file ?? false;

  let consentWarning = false;
  if (is_visible && !consent_on_file) {
    is_visible = false;
    consentWarning = true;
  }

  const payload = { ...fields, is_visible, consent_on_file, is_placeholder: false };

  const query = id
    ? supabase.from("testimonials").update(payload).eq("id", id).select().single()
    : supabase.from("testimonials").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveTestimonial");

  return consentWarning ? { ...(data as Testimonial), __consentWarning: true } : (data as Testimonial);
}

async function deleteTestimonial(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  throwIfError(error, "deleteTestimonial");
}

// ---------------------------------------------------------------------
// Program stages + steps
// ---------------------------------------------------------------------

async function getProgramStages(): Promise<ProgramStage[]> {
  const supabase = await getClient();
  const { data: stages, error } = await supabase
    .from("program_stages")
    .select("*")
    .order("sort_order", { ascending: true });
  throwIfError(error, "getProgramStages");

  const { data: steps, error: stepsError } = await supabase
    .from("program_steps")
    .select("*")
    .order("sort_order", { ascending: true });
  throwIfError(stepsError, "getProgramStages steps");

  return (stages ?? []).map((stage) => ({
    ...stage,
    steps: (steps ?? []).filter((s) => s.stage_id === stage.id),
  })) as ProgramStage[];
}

async function saveProgramStage(input: Partial<ProgramStage> & { id?: string }): Promise<ProgramStage> {
  const supabase = await getClient();
  const { id, steps, ...fields } = input as any;
  const payload = { ...fields, is_placeholder: false };

  let stageId = id;
  if (id) {
    const { data, error } = await supabase.from("program_stages").update(payload).eq("id", id).select().single();
    throwIfError(error, "saveProgramStage update");
    stageId = data!.id;
  } else {
    const { data, error } = await supabase.from("program_stages").insert(payload).select().single();
    throwIfError(error, "saveProgramStage insert");
    stageId = data!.id;
  }

  // Upsert-only semantics, mirroring the mock exactly (see friction note #4
  // — no delete-on-omit; deleteProgramStep is the dedicated removal path).
  if (steps) {
    for (const step of steps as ProgramStep[]) {
      const stepPayload = { ...step, stage_id: stageId, is_placeholder: false };
      const { id: stepId, ...stepFields } = stepPayload as any;
      if (stepId) {
        const { error: upErr } = await supabase.from("program_steps").update(stepFields).eq("id", stepId);
        throwIfError(upErr, "saveProgramStage upsert step");
      } else {
        const { error: insErr } = await supabase.from("program_steps").insert(stepFields);
        throwIfError(insErr, "saveProgramStage insert step");
      }
    }
  }

  const { data: freshSteps } = await supabase
    .from("program_steps")
    .select("*")
    .eq("stage_id", stageId)
    .order("sort_order", { ascending: true });
  const { data: freshStage, error: freshError } = await supabase
    .from("program_stages")
    .select("*")
    .eq("id", stageId)
    .single();
  throwIfError(freshError, "saveProgramStage refetch");

  return { ...freshStage, steps: freshSteps ?? [] } as ProgramStage;
}

async function deleteProgramStage(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("program_stages").delete().eq("id", id);
  throwIfError(error, "deleteProgramStage");
}

async function deleteProgramStep(stageId: string, stepId: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase
    .from("program_steps")
    .delete()
    .eq("id", stepId)
    .eq("stage_id", stageId);
  throwIfError(error, "deleteProgramStep");
}

// ---------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------

async function listScheduleEntries(opts: { visibleOnly?: boolean } = {}): Promise<ScheduleEntry[]> {
  const supabase = await getClient();
  let query = supabase.from("schedule_entries").select("*");
  if (opts.visibleOnly) {
    query = query.eq("is_visible", true);
  }
  const { data, error } = await query.order("sort_order", { ascending: true });
  throwIfError(error, "listScheduleEntries");
  return (data ?? []) as ScheduleEntry[];
}

async function saveScheduleEntry(input: Partial<ScheduleEntry> & { id?: string }): Promise<ScheduleEntry> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const payload = { ...fields, is_placeholder: false };
  const query = id
    ? supabase.from("schedule_entries").update(payload).eq("id", id).select().single()
    : supabase.from("schedule_entries").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveScheduleEntry");
  return data as ScheduleEntry;
}

async function deleteScheduleEntry(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("schedule_entries").delete().eq("id", id);
  throwIfError(error, "deleteScheduleEntry");
}

// ---------------------------------------------------------------------
// Galleries
// ---------------------------------------------------------------------

const GALLERY_SELECT = "*, images:gallery_images(*)";

function rowToGallery(row: any): Gallery {
  const images = (row.images ?? []).slice().sort((a: GalleryImage, b: GalleryImage) => a.sort_order - b.sort_order);
  return { ...row, images } as Gallery;
}

async function listGalleries(): Promise<Gallery[]> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("galleries").select(GALLERY_SELECT);
  throwIfError(error, "listGalleries");
  return (data ?? []).map(rowToGallery);
}

async function getGallery(slug: string): Promise<Gallery | null> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("galleries").select(GALLERY_SELECT).eq("slug", slug).maybeSingle();
  throwIfError(error, "getGallery");
  return data ? rowToGallery(data) : null;
}

async function saveGallery(input: Partial<Gallery> & { id?: string }): Promise<Gallery> {
  const supabase = await getClient();
  const { id, images, ...fields } = input as any;
  const payload = { ...fields, is_placeholder: false };

  let galleryId = id;
  if (id) {
    const { data, error } = await supabase.from("galleries").update(payload).eq("id", id).select().single();
    throwIfError(error, "saveGallery update");
    galleryId = data!.id;
  } else {
    const { data, error } = await supabase.from("galleries").insert(payload).select().single();
    throwIfError(error, "saveGallery insert");
    galleryId = data!.id;
  }

  if (images) {
    const { error: deleteError } = await supabase.from("gallery_images").delete().eq("gallery_id", galleryId);
    throwIfError(deleteError, "saveGallery delete images");
    if (images.length > 0) {
      const rows = images.map((img: GalleryImage, idx: number) => ({
        gallery_id: galleryId,
        media_id: img.media_id,
        alt_he: img.alt_he,
        sort_order: img.sort_order ?? idx,
      }));
      const { error: insertError } = await supabase.from("gallery_images").insert(rows);
      throwIfError(insertError, "saveGallery insert images");
    }
  }

  const { data: full, error: fullError } = await supabase
    .from("galleries")
    .select(GALLERY_SELECT)
    .eq("id", galleryId)
    .single();
  throwIfError(fullError, "saveGallery refetch");
  return rowToGallery(full);
}

async function deleteGallery(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("galleries").delete().eq("id", id);
  throwIfError(error, "deleteGallery");
}

// ---------------------------------------------------------------------
// Podcast
// ---------------------------------------------------------------------

async function listPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("podcast_episodes")
    .select("*")
    .order("published_at", { ascending: false });
  throwIfError(error, "listPodcastEpisodes");
  return (data ?? []) as PodcastEpisode[];
}

async function savePodcastEpisode(input: Partial<PodcastEpisode> & { id?: string }): Promise<PodcastEpisode> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const payload = { ...fields, is_placeholder: false };
  const query = id
    ? supabase.from("podcast_episodes").update(payload).eq("id", id).select().single()
    : supabase.from("podcast_episodes").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "savePodcastEpisode");
  return data as PodcastEpisode;
}

async function deletePodcastEpisode(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("podcast_episodes").delete().eq("id", id);
  throwIfError(error, "deletePodcastEpisode");
}

// ---------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------

async function listMedia(opts: AdminListOptions = {}): Promise<Paginated<Media>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 30;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("media").select("*", { count: "exact" });
  if (opts.q) {
    query = query.or(`alt_he.ilike.%${opts.q}%,storage_path.ilike.%${opts.q}%`);
  }
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  throwIfError(error, "listMedia");
  return { items: (data ?? []) as Media[], total: count ?? 0, page, perPage };
}

async function getMedia(id: string): Promise<Media | null> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("media").select("*").eq("id", id).maybeSingle();
  throwIfError(error, "getMedia");
  return (data as Media | null) ?? null;
}

async function saveMedia(input: Partial<Media> & { id?: string }): Promise<Media> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const query = id
    ? supabase.from("media").update(fields).eq("id", id).select().single()
    : supabase.from("media").insert(fields).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveMedia");
  return data as Media;
}

async function deleteMedia(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("media").delete().eq("id", id);
  throwIfError(error, "deleteMedia");
}

// ---------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------

function buildMenuTree(rows: any[]): MenuItem[] {
  const byId = new Map<string, MenuItem>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      label: r.label,
      href: r.href,
      sort_order: r.sort_order,
      open_in_new_tab: r.open_in_new_tab,
      children: [],
    });
  }
  const roots: MenuItem[] = [];
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parent_id && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (items: MenuItem[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order);
    items.forEach((i) => sortRec(i.children));
  };
  sortRec(roots);
  return roots;
}

async function getMenu(location: MenuLocation): Promise<MenuItem[]> {
  const supabase = await getClient();
  const { data: menu, error: menuError } = await supabase
    .from("menus")
    .select("id")
    .eq("location", location)
    .maybeSingle();
  throwIfError(menuError, "getMenu menu lookup");
  if (!menu) return [];

  const { data: items, error } = await supabase.from("menu_items").select("*").eq("menu_id", menu.id);
  throwIfError(error, "getMenu items");
  return buildMenuTree(items ?? []);
}

async function ensureMenu(supabase: Awaited<ReturnType<typeof getClient>>, location: MenuLocation): Promise<string> {
  const { data: existing } = await supabase.from("menus").select("id").eq("location", location).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("menus").insert({ location }).select("id").single();
  throwIfError(error, "ensureMenu");
  return data!.id;
}

async function saveMenuItem(
  location: MenuLocation,
  item: Partial<MenuItem> & { id?: string; parent_id?: string | null },
): Promise<MenuItem> {
  const supabase = await getClient();
  const menuId = await ensureMenu(supabase, location);
  const { id, parent_id, children, ...fields } = item as any;

  const payload = { ...fields, menu_id: menuId, parent_id: parent_id ?? null };
  const query = id
    ? supabase.from("menu_items").update(payload).eq("id", id).select().single()
    : supabase.from("menu_items").insert(payload).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveMenuItem");
  return { ...data, children: [] } as MenuItem;
}

async function deleteMenuItem(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  throwIfError(error, "deleteMenuItem");
}

async function reorderMenuItems(location: MenuLocation, orderedIds: string[]): Promise<void> {
  const supabase = await getClient();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("menu_items").update({ sort_order: index + 1 }).eq("id", id)),
  );
}

// ---------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------

async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = await getClient();
  const { data, error } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
  throwIfError(error, "getSiteSettings");
  if (!data) {
    throw new Error("[supabaseDataSource] getSiteSettings: no site_settings row exists — seed the database first.");
  }
  return data as SiteSettings;
}

async function saveSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
  const supabase = await getClient();
  const { data: existing, error: existingError } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  throwIfError(existingError, "saveSiteSettings lookup");

  if (existing) {
    const { data, error } = await supabase
      .from("site_settings")
      .update(input)
      .eq("id", existing.id)
      .select()
      .single();
    throwIfError(error, "saveSiteSettings update");
    return data as SiteSettings;
  }
  const { data, error } = await supabase.from("site_settings").insert(input).select().single();
  throwIfError(error, "saveSiteSettings insert");
  return data as SiteSettings;
}

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------

async function search(q: string): Promise<SearchResult[]> {
  const supabase = await getClient();
  const results: SearchResult[] = [];

  const { data: posts } = await supabase
    .from("posts")
    .select("slug, title, excerpt")
    .eq("status", "published")
    .lte("published_at", nowIso())
    .not("published_at", "is", null)
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(20);
  for (const p of posts ?? []) {
    results.push({ type: "post", slug: p.slug, title: p.title, excerpt: p.excerpt });
  }

  const { data: trainings } = await supabase
    .from("trainings")
    .select("slug, title, excerpt")
    .eq("status", "published")
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(20);
  for (const t of trainings ?? []) {
    results.push({ type: "training", slug: t.slug, title: t.title, excerpt: t.excerpt });
  }

  const { data: pages } = await supabase
    .from("pages")
    .select("slug, title")
    .eq("status", "published")
    .textSearch("search_vector", q, { type: "websearch", config: "simple" })
    .limit(20);
  for (const pg of pages ?? []) {
    results.push({ type: "page", slug: pg.slug, title: pg.title, excerpt: null });
  }

  return results;
}

// ---------------------------------------------------------------------
// Study years — see friction note #1 at top of file.
// ---------------------------------------------------------------------

async function listStudyYears() {
  return studyYears;
}

// ---------------------------------------------------------------------
// Public writes (leads / newsletter / contact)
// ---------------------------------------------------------------------

/**
 * FIX (public-forms wiring task, found during live verification): all three
 * of these anon-write methods previously chained `.select("id").single()`
 * after the insert/upsert to read back the generated id. That silently
 * requires anon SELECT permission on the just-written row to succeed — and
 * §7 explicitly, correctly denies anon SELECT on `leads`,
 * `contact_messages`, and `newsletter_subscribers` ("Zero anon access").
 * PostgREST then returns a real RLS error ("new row violates row-level
 * security policy") even though the INSERT itself succeeded, so every
 * public-facing submission was failing after writing (or upserting) the
 * row, invisibly to the visitor since the Server Action's catch block
 * turned it into a generic Hebrew error.
 *
 * FIX, not a workaround: generate the id client-side with
 * `crypto.randomUUID()` and pass it in explicitly on the insert/upsert, so
 * the id is known up front and no read-back is ever needed. RLS itself is
 * untouched — anon still cannot SELECT these tables, exactly as specified.
 */
async function createLead(input: LeadInput): Promise<{ id: string }> {
  const supabase = await getClient();
  const id = crypto.randomUUID();
  const payload = { id, ...input, status: "new" as const, notes: null };
  const { error } = await supabase.from("leads").insert(payload);
  throwIfError(error, "createLead");
  return { id };
}

async function subscribeNewsletter(input: NewsletterSubscribeInput): Promise<{ id: string }> {
  const supabase = await getClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("newsletter_subscribers").insert({
    id,
    email: input.email,
    consent_at: input.consent_at,
    source: input.source,
    status: "subscribed",
    unsubscribe_token: crypto.randomUUID(),
  });
  if (error) {
    // FIX (same live-verification pass as the id-generation fix above, a
    // SEPARATE bug from the read-back one): §7's RLS for
    // `newsletter_subscribers` grants anon INSERT only — there is
    // deliberately no anon UPDATE policy (anon has zero read/update access
    // per §7's "Zero anon access to leads/contact_messages/
    // newsletter_subscribers"). A real Postgres `upsert(...,
    // { onConflict: 'email' })` performs an UPDATE on conflict under the
    // hood, which anon is not permitted to do — so re-subscribing an
    // existing email as a public visitor always threw "new row violates
    // row-level security policy" (42501), even though the row already
    // existing is not an error from the visitor's point of view. A unique
    // violation (23505) on `email` here means "already subscribed" — treat
    // it as success without attempting any update, rather than either
    // erroring or silently requiring an UPDATE grant anon shouldn't have.
    // (The `editor`/`admin` role can still update subscriber status from
    // `/admin`, via `saveNewsletterSubscriber` — unaffected by this.)
    if (error.code === "23505") {
      return { id };
    }
    throwIfError(error, "subscribeNewsletter");
  }
  return { id };
}

async function unsubscribeNewsletter(token: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token);
  throwIfError(error, "unsubscribeNewsletter");
}

async function createContactMessage(input: ContactMessageInput): Promise<{ id: string }> {
  const supabase = await getClient();
  const id = crypto.randomUUID();
  const { error } = await supabase.from("contact_messages").insert({ id, ...input });
  throwIfError(error, "createContactMessage");
  return { id };
}

// ---------------------------------------------------------------------
// Admin: captured data lists
// ---------------------------------------------------------------------

async function listLeadsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Lead>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("leads").select("*", { count: "exact" });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.q) {
    query = query.or(
      `first_name.ilike.%${opts.q}%,last_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%,phone.ilike.%${opts.q}%`,
    );
  }
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  throwIfError(error, "listLeadsAdmin");
  return { items: (data ?? []) as Lead[], total: count ?? 0, page, perPage };
}

async function listNewsletterSubscribersAdmin(opts: AdminListOptions = {}): Promise<Paginated<NewsletterSubscriber>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("newsletter_subscribers").select("*", { count: "exact" });
  if (opts.status) query = query.eq("status", opts.status);
  if (opts.q) query = query.or(`email.ilike.%${opts.q}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  throwIfError(error, "listNewsletterSubscribersAdmin");
  return { items: (data ?? []) as NewsletterSubscriber[], total: count ?? 0, page, perPage };
}

async function listContactMessagesAdmin(opts: AdminListOptions = {}): Promise<Paginated<ContactMessage>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("contact_messages").select("*", { count: "exact" });
  if (opts.q) query = query.or(`name.ilike.%${opts.q}%,email.ilike.%${opts.q}%,message.ilike.%${opts.q}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  throwIfError(error, "listContactMessagesAdmin");
  return { items: (data ?? []) as ContactMessage[], total: count ?? 0, page, perPage };
}

async function saveLead(input: { id: string; status?: string; notes?: string | null }): Promise<Lead> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const { data, error } = await supabase.from("leads").update(fields).eq("id", id).select().single();
  throwIfError(error, "saveLead");
  if (!data) throw new Error("הליד המבוקש לא נמצא.");
  return data as Lead;
}

async function saveNewsletterSubscriber(input: { id: string; status: string }): Promise<NewsletterSubscriber> {
  const supabase = await getClient();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .update({ status: input.status })
    .eq("id", input.id)
    .select()
    .single();
  throwIfError(error, "saveNewsletterSubscriber");
  if (!data) throw new Error("הרשומה המבוקשת לא נמצאה.");
  return data as NewsletterSubscriber;
}

// ---------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------

async function listRedirectsAdmin(opts: AdminListOptions = {}): Promise<Paginated<Redirect>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("redirects").select("*", { count: "exact" });
  if (opts.q) query = query.or(`from_path.ilike.%${opts.q}%,to_path.ilike.%${opts.q}%`);
  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  throwIfError(error, "listRedirectsAdmin");
  return { items: (data ?? []) as Redirect[], total: count ?? 0, page, perPage };
}

async function saveRedirect(input: Partial<Redirect> & { id?: string }): Promise<Redirect> {
  const supabase = await getClient();
  const { id, ...fields } = input;
  const query = id
    ? supabase.from("redirects").update(fields).eq("id", id).select().single()
    : supabase.from("redirects").insert(fields).select().single();
  const { data, error } = await query;
  throwIfError(error, "saveRedirect");
  return data as Redirect;
}

async function deleteRedirect(id: string): Promise<void> {
  const supabase = await getClient();
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  throwIfError(error, "deleteRedirect");
}

// ---------------------------------------------------------------------
// Users / profiles
// ---------------------------------------------------------------------

async function listUsersAdmin(opts: AdminListOptions = {}): Promise<Paginated<Profile>> {
  const supabase = await getClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let query = supabase.from("profiles").select("*", { count: "exact" });
  if (opts.q) query = query.or(`full_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);
  if (opts.status === "active") query = query.eq("is_active", true);
  else if (opts.status === "inactive") query = query.eq("is_active", false);
  const { data, error, count } = await query.order("full_name", { ascending: true }).range(from, to);
  throwIfError(error, "listUsersAdmin");
  return { items: (data ?? []) as Profile[], total: count ?? 0, page, perPage };
}

/**
 * §8 Users screen "invite, set role, deactivate." Unlike the mock, a real
 * `profiles` row can ONLY be created by the `handle_new_user` trigger on
 * `auth.users` insert (§6/§7 standard pattern) — this DataSource method
 * therefore only UPDATES an existing profile (role/full_name/is_active).
 * Creating a brand-new user (the "invite" verb) requires the Supabase Admin
 * API (service role), which this RLS-scoped client cannot do — that flow
 * lives in the dedicated one-off/admin Server Action layer, not here. If
 * `saveUser` is called with no `id`, it throws rather than silently doing
 * nothing, so this gap is visible immediately instead of failing quietly.
 */
async function saveUser(input: Partial<Profile> & { id?: string }): Promise<Profile> {
  const supabase = await getClient();
  const { id, email, ...fields } = input as any;
  if (!id) {
    throw new Error(
      "[supabaseDataSource] saveUser: creating a new user requires the Supabase Admin API (auth.admin.createUser) via a service-role Server Action, not this RLS-scoped method. See lib/supabase/admin.ts.",
    );
  }
  const { data, error } = await supabase.from("profiles").update(fields).eq("id", id).select().single();
  throwIfError(error, "saveUser");
  return data as Profile;
}

async function deleteUser(id: string): Promise<void> {
  const supabase = await getClient();
  // Deletes the profiles row; per §8 "deactivate" is the primary verb (an
  // admin-only Server Action layer should prefer is_active=false via
  // saveUser). This delete does NOT remove the auth.users row (that
  // requires the Admin API / service role — out of scope for this
  // RLS-scoped client, same reasoning as saveUser's create-path above).
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  throwIfError(error, "deleteUser");
}

// ---------------------------------------------------------------------

export const supabaseDataSource: DataSource = {
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
