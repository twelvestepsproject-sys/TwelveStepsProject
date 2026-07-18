import type {
  Page,
  PageInput,
  PostSummary,
  Post,
  Training,
  TrainingSummary,
  Lecturer,
  Testimonial,
  ProgramStage,
  ScheduleEntry,
  SiteSettings,
  MenuItem,
  MenuLocation,
  SearchResult,
  Category,
  Gallery,
  PodcastEpisode,
  Media,
  Lead,
  LeadInput,
  NewsletterSubscribeInput,
  NewsletterSubscriber,
  ContactMessageInput,
  ContactMessage,
  Paginated,
  Redirect,
  Profile,
} from "@/lib/schemas";

/**
 * lib/queries/types.ts — the seam (§5.5). The ONLY contract any component
 * fetches through. Two implementations exist: `mockDataSource` (Phase 2+)
 * and `supabaseDataSource` (Phase 5, does not exist yet). Components never
 * import either implementation directly, and never learn which one is
 * answering them.
 *
 * Rules baked into every method below (§5.5):
 *  - Everything is async, even though the mock is synchronous under the hood.
 *  - Pagination / filtering / sorting / search happen inside the data
 *    source, never in a component — hence `opts` parameters here instead
 *    of components slicing/filtering returned arrays themselves.
 *  - Every PAGINATED list method returns `Promise<Paginated<T>>`, never a
 *    bare array — see `listPosts`, and the admin list methods below.
 *  - Published-only by default: `{ includeDrafts: true }` is how the admin
 *    opts in to seeing drafts / future-dated rows. Public listing logic
 *    for posts is two independent filters, both required:
 *    `status = 'published' AND published_at <= now()`.
 *  - No joins in components: `getTraining()` returns `instructors` nested
 *    and resolved; `getProgramStages()` returns stages with nested `steps`;
 *    `getMenu()` returns a resolved nested tree, not flat rows.
 */

export interface ListPostsOptions {
  page?: number;
  perPage?: number;
  categorySlug?: string;
  includeDrafts?: boolean;
  /** ADDED (admin CRUD task, Phase 4): the Posts admin list screen (§8:
   * "CRUD lists: search...") needs free-text search the same way every
   * other admin list does — `listTrainingsAdmin`/`listLecturersAdmin`/etc.
   * already have `q` via `AdminListOptions`. Posts has no dedicated admin
   * list method (it reuses the public `listPosts` with `includeDrafts`),
   * so `q` is added directly here rather than inventing a parallel
   * `listPostsAdmin`. Filtering still happens inside the data source
   * (§5.5 rule 4), never left to the admin screen. */
  q?: string;
}

export interface ListTrainingsOptions {
  featuredOnly?: boolean;
  includeDrafts?: boolean;
}

export interface AdminListOptions {
  page?: number;
  perPage?: number;
  /** Free-text search across the entity's primary text fields. */
  q?: string;
  status?: string;
  includeDrafts?: boolean;
}

export interface DataSource {
  // ---- Pages ----
  getPage(slug: string): Promise<Page | null>;
  listPages(opts?: AdminListOptions): Promise<Paginated<Page>>;
  savePage(input: PageInput): Promise<Page>;
  deletePage(id: string): Promise<void>;

  // ---- Posts ----
  listPosts(opts?: ListPostsOptions): Promise<Paginated<PostSummary>>;
  getPost(slug: string): Promise<Post | null>;
  /**
   * ADDED (admin CRUD task, Phase 4): `getPost` is public-facing and
   * filters to published-only (§5.5 rule 5), so it cannot be used to load a
   * draft post into the admin edit form. `listPosts` only returns
   * `PostSummary` (no `body`). Neither covers "admin opens a draft post to
   * edit it." This is the same shape as `getTraining`/`getLecturer` minus
   * the public visibility gate — an admin-only, id-based, full-`Post` read.
   */
  getPostAdmin(id: string): Promise<Post | null>;
  savePost(input: Partial<Post> & { id?: string }): Promise<Post>;
  deletePost(id: string): Promise<void>;

  // ---- Categories ----
  listCategories(): Promise<Category[]>;
  getCategory(slug: string): Promise<Category | null>;
  saveCategory(input: Partial<Category> & { id?: string }): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // ---- Trainings ----
  listTrainings(opts?: ListTrainingsOptions): Promise<Training[]>;
  listTrainingsAdmin(opts?: AdminListOptions): Promise<Paginated<Training>>;
  getTraining(slug: string): Promise<Training | null>;
  saveTraining(input: Partial<Training> & { id?: string }): Promise<Training>;
  deleteTraining(id: string): Promise<void>;

  // ---- Lecturers ----
  listLecturers(opts?: { visibleOnly?: boolean }): Promise<Lecturer[]>;
  listLecturersAdmin(opts?: AdminListOptions): Promise<Paginated<Lecturer>>;
  getLecturer(idOrSlug: string): Promise<Lecturer | null>;
  saveLecturer(input: Partial<Lecturer> & { id?: string }): Promise<Lecturer>;
  deleteLecturer(id: string): Promise<void>;

  // ---- Testimonials ----
  listTestimonials(opts?: { visibleOnly?: boolean }): Promise<Testimonial[]>;
  listTestimonialsAdmin(opts?: AdminListOptions): Promise<Paginated<Testimonial>>;
  saveTestimonial(input: Partial<Testimonial> & { id?: string }): Promise<Testimonial>;
  deleteTestimonial(id: string): Promise<void>;

  // ---- Program stages + steps ----
  getProgramStages(): Promise<ProgramStage[]>;
  saveProgramStage(input: Partial<ProgramStage> & { id?: string }): Promise<ProgramStage>;
  deleteProgramStage(id: string): Promise<void>;
  /**
   * ADDED (admin CRUD task, Phase 4): `saveProgramStage({ steps })` only
   * UPSERTS the steps it's given — it never removes a step that's absent
   * from the array (see lib/queries/mock/index.ts saveProgramStage: it
   * iterates `input.steps` and upserts each into the flat `programSteps`
   * store, with no diff/removal pass). There was no way to delete a single
   * step through the existing interface. Mirrors deleteProgramStage's
   * shape, scoped to one step.
   */
  deleteProgramStep(stageId: string, stepId: string): Promise<void>;

  // ---- Schedule ----
  listScheduleEntries(opts?: { visibleOnly?: boolean }): Promise<ScheduleEntry[]>;
  saveScheduleEntry(input: Partial<ScheduleEntry> & { id?: string }): Promise<ScheduleEntry>;
  deleteScheduleEntry(id: string): Promise<void>;

  // ---- Galleries ----
  listGalleries(): Promise<Gallery[]>;
  getGallery(slug: string): Promise<Gallery | null>;
  saveGallery(input: Partial<Gallery> & { id?: string }): Promise<Gallery>;
  deleteGallery(id: string): Promise<void>;

  // ---- Podcast ----
  listPodcastEpisodes(): Promise<PodcastEpisode[]>;
  savePodcastEpisode(input: Partial<PodcastEpisode> & { id?: string }): Promise<PodcastEpisode>;
  deletePodcastEpisode(id: string): Promise<void>;

  // ---- Media ----
  listMedia(opts?: AdminListOptions): Promise<Paginated<Media>>;
  getMedia(id: string): Promise<Media | null>;
  saveMedia(input: Partial<Media> & { id?: string }): Promise<Media>;
  deleteMedia(id: string): Promise<void>;

  // ---- Menus ----
  getMenu(location: MenuLocation): Promise<MenuItem[]>;
  saveMenuItem(location: MenuLocation, item: Partial<MenuItem> & { id?: string; parent_id?: string | null }): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  reorderMenuItems(location: MenuLocation, orderedIds: string[]): Promise<void>;

  // ---- Site settings ----
  getSiteSettings(): Promise<SiteSettings>;
  saveSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings>;

  // ---- Search ----
  search(q: string): Promise<SearchResult[]>;

  // ---- Study years (studies-hub sub-pages) ----
  // JUDGMENT CALL (Phase 3 page-types task): §6 has no schema for a
  // "studies hub" hierarchy distinct from `trainings` + `program_stages`.
  // Rather than leaving `/tochnit-halimudim/[year-slug]` importing a
  // fixture directly (which would break the "components only import db"
  // rule), this thin method is added so the seam stays intact — the
  // underlying data is still the small, explicitly-flagged, NOT-in-§6
  // `study-years.ts` fixture (see that file's header comment and
  // docs/content-needed.md), just accessed the same way every other
  // collection is.
  listStudyYears(): Promise<{ slug: string; yearNumber: number; label: string; description: string }[]>;

  // ---- Public writes (Server Actions, Phase 4) ----
  createLead(input: LeadInput): Promise<{ id: string }>;
  subscribeNewsletter(input: NewsletterSubscribeInput): Promise<{ id: string }>;
  unsubscribeNewsletter(token: string): Promise<void>;
  createContactMessage(input: ContactMessageInput): Promise<{ id: string }>;

  // ---- Admin: captured data lists (§8 Leads / Messages / Subscribers) ----
  listLeadsAdmin(opts?: AdminListOptions): Promise<Paginated<Lead>>;
  listNewsletterSubscribersAdmin(opts?: AdminListOptions): Promise<Paginated<NewsletterSubscriber>>;
  listContactMessagesAdmin(opts?: AdminListOptions): Promise<Paginated<ContactMessage>>;
  /**
   * ADDED (§8 Leads/Messages/Subscribers screen, this task): the existing
   * list methods above have no counterpart for updating a single lead's
   * `status`/`notes` or a subscriber's `status` — every other admin screen
   * in this codebase has a `save*` method for this (see `saveScheduleEntry`
   * etc.), so this follows the same shape rather than inventing a
   * parallel "patch" verb. Contact messages have no admin-editable field
   * per §6 (no status/notes column on that table) — there is deliberately
   * no `saveContactMessage`.
   */
  saveLead(input: { id: string; status?: string; notes?: string | null }): Promise<Lead>;
  saveNewsletterSubscriber(input: { id: string; status: string }): Promise<NewsletterSubscriber>;

  // ---- Redirects (§8 "CRUD"; §6 "applied in middleware") ----
  // ADDED (this task): no schema/DataSource coverage existed yet for this
  // §6 table — added additively, following the same list/save/delete shape
  // as every other admin CRUD entity in this file.
  listRedirectsAdmin(opts?: AdminListOptions): Promise<Paginated<Redirect>>;
  saveRedirect(input: Partial<Redirect> & { id?: string }): Promise<Redirect>;
  deleteRedirect(id: string): Promise<void>;

  // ---- Users / profiles (§8 "invite, set role, deactivate — admin only") ----
  // ADDED (this task): §6's `profiles` table had no DataSource coverage.
  // "Invite" has no real backend yet (no Supabase Auth until Phase 5) — see
  // the Server Action layer for how this mock method is explicitly framed
  // as a placeholder for that future flow, not a real invite.
  listUsersAdmin(opts?: AdminListOptions): Promise<Paginated<Profile>>;
  saveUser(input: Partial<Profile> & { id?: string }): Promise<Profile>;
  deleteUser(id: string): Promise<void>;
}
