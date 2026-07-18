# Build Spec — Hebrew RTL therapy-college site + admin CMS (Next.js / Supabase / Vercel)

> Copy into your coding agent as `docs/BUILD_SPEC.md`.
> Replace every `[BRACKETED]` value before the first run.

---

## 0. Context, and the one rule that overrides everything else

We are building a **brand-new website from scratch** for an Israeli organization in the psychotherapy / training space. Hebrew, RTL, with a custom admin CMS.

There is **no existing site to migrate**. Nothing is being ported. Every asset originates with us or with the client.

### Current stage: local development

No client name, domain, logo, brand, or final content exists yet. **This does not block anything.** Build against the placeholder brand and placeholder copy defined in §3.5 and §15. Everything brand-related — logo, colors, fonts, site name, every string — is CMS-editable by design, so the real identity gets typed in later by the site admin rather than swapped in by a developer.

Run locally. Do not set up Vercel, DNS, or Search Console until I say so.

### The rule

Competitor sites in this space (e.g. `12triotherapy.co.il`) may be referenced **only for structural and functional patterns** — "this kind of site typically has a trainings carousel, a testimonials slider, a stepper for the program stages." That is the extent of it.

**Never** copy from any existing site:
- text, headlines, taglines, article bodies, course descriptions, bios — not verbatim, not reworded, not "inspired by" at the sentence level
- images, photographs, illustrations, icons, logos
- brand names, colors, fonts, or visual identity
- names, faces, or quotes of real people

If you catch yourself with a competitor's page open while writing copy or picking a color, stop. Structural patterns are shared industry vocabulary. Everything you can see on their screen is theirs.

**Photos of people and named testimonials** require the client's written consent for each person. Never place a real name or face on the site unless the client supplies it and confirms consent. No stock photo may be captioned as a real client or graduate.

Ask me before assuming anything that materially affects architecture. Do not silently skip requirements.

---

## 1. Objective

1. A **public site** — Hebrew, RTL, on the client's own brand and content.
2. An **admin CMS** at `/admin` where a non-technical admin edits every piece of content, including page section order, without a developer.
3. **Vercel** hosting; **Supabase** for database, auth, and file storage.

Success = the client logs into `/admin`, changes any headline, image, course, article, lecturer, or testimonial, hits Publish, and sees it live in seconds — no redeploy.

---

## 2. Tech stack (fixed — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js 15+, **App Router**, React Server Components |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS v4 + CSS variables for design tokens |
| UI primitives | shadcn/ui (Radix) — admin panel mainly |
| DB / Auth / Storage | Supabase (Postgres, Supabase Auth, Supabase Storage) |
| DB access | `@supabase/ssr` + types from `supabase gen types typescript` |
| Migrations | Supabase CLI, SQL files committed to `/supabase/migrations` |
| Forms | react-hook-form + zod, validated server-side too |
| Rich text | **Tiptap** — JSON is the source of truth, rendered to HTML server-side, sanitized on write |
| Images | `next/image` over Supabase Storage, AVIF/WebP |
| Hosting | Vercel |
| Package manager | pnpm |
| Tests | Vitest (unit), Playwright (critical E2E flows) |

No WordPress. No headless-CMS SaaS. The CMS is ours, built on Supabase.

---

## 3. Hard constraints

- **Hebrew, RTL first.** `<html lang="he" dir="rtl">`. Logical CSS properties only (`ms-*`/`me-*`, `start`/`end`) — never `left`/`right`. **Fonts: Heebo (headings) + Assistant (body)**, both SIL Open Font License, self-hosted via `next/font/local` — download the woff2 files, don't hit Google's CDN at runtime. OFL permits self-hosting, so nothing is blocked. If the client later brings a licensed brand font, confirm its license covers self-hosting and record it in `docs/licenses.md`.
- **Accessibility: Israeli Standard IS 5568 / WCAG 2.1 AA.** Keyboard navigable, visible focus rings, semantic landmarks, alt text on every image (alt text is a CMS field), skip-to-content link, accessible names on icon buttons. Self-built accessibility toolbar (font size, contrast, grayscale, link highlight, reset) plus an `/accessibility-statement` page. Ask me before adding any third-party overlay vendor — most of them hurt more than they help.
- **Performance:** Lighthouse mobile ≥ 90 across all four categories on the homepage. LCP < 2.5s, CLS < 0.1. Third-party scripts load `afterInteractive` or on interaction only.
- **No secrets client-side.** `SUPABASE_SERVICE_ROLE_KEY` is server-only — Server Actions and Route Handlers exclusively.
- **Content honesty.** Never fabricate a testimonial, a graduate count, a success rate, a credential, or a date. This is a mental-health context; invented social proof is a real harm, not a placeholder. Missing content goes to `docs/content-needed.md`.

---

## 3.5. Branding & theming — **everything is CMS-editable, nothing is hardcoded**

The site must ship with a reasonable default look, and the admin must be able to change the entire visual identity from `/admin` without a developer. Treat brand as content.

### Design tokens

Every color, radius, and spacing decision lives in a **CSS variable**. No component ever writes a hex value. No Tailwind arbitrary color (`bg-[#1F5F5B]`) anywhere — it's a lint error.

Define defaults in `app/globals.css` via Tailwind v4's `@theme`:

```css
@theme {
  /* brand — admin-editable */
  --color-primary:        #1F5F5B;   /* deep teal — calm, trustworthy, not clinical */
  --color-primary-hover:  #174A47;
  --color-primary-fg:     #FFFFFF;

  --color-accent:         #B05537;   /* warm terracotta — CTAs, human warmth */
  --color-accent-hover:   #96462C;
  --color-accent-fg:      #FFFFFF;

  /* surfaces */
  --color-bg:             #FAF7F2;   /* warm sand, not white — softer for long reading */
  --color-surface:        #FFFFFF;
  --color-surface-alt:    #F1EBE1;
  --color-border:         #E4DED4;

  /* text */
  --color-ink:            #1C1B19;
  --color-ink-muted:      #6B665F;

  /* semantic — not admin-editable */
  --color-success:        #2E7D5B;
  --color-error:          #B3261E;
  --color-warning:        #9A6700;

  /* shape & type scale */
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-full: 9999px;
  --font-display: 'Heebo', sans-serif;
  --font-body:    'Assistant', sans-serif;
}
```

Rationale for the defaults, so you understand what to preserve if you adjust them: the palette is deliberately warm and low-contrast-shock. A recovery/therapy audience reacts badly to cold corporate blue and to stark white. Teal reads as calm and credible; terracotta gives a human, non-institutional accent for CTAs; sand backgrounds reduce reading fatigue. **All pairs must pass WCAG AA** — verify with a contrast checker, don't eyeball it. If you change a token, re-verify.

### How the admin overrides them

- `site_settings.theme jsonb` holds overrides for the brand-tier tokens only (primary, accent, surfaces, ink, radii). Semantic colors stay fixed.
- The root layout calls `db.getSiteSettings()` and injects the overrides as an inline `<style>` block on `:root`, **after** the stylesheet. Unset keys fall back to the `@theme` defaults automatically — that's just CSS cascade, no merge logic needed.
- Because tokens resolve at runtime, a color change is a DB write + `revalidateTag('site-settings')`. **No rebuild.**
- Inject the style server-side in the initial HTML. Don't apply it in a `useEffect` — that flashes the default palette on every load.

### Admin → Branding screen (§8)

- **Logo** — upload, stored in `media`, referenced by `site_settings.logo_id`. Also: `logo_dark_id` (optional, for dark surfaces), `favicon_id`, `og_default_image_id`. SVG and PNG accepted; SVGs sanitized on upload (strip `<script>`, `onload`, external refs — an unsanitized SVG upload is an XSS vector). Alt text required.
- **Site name & tagline** — plain text fields. The name appears in the header, `<title>` suffix, JSON-LD `Organization`, and emails. **It must not be a hardcoded string anywhere.**
- **Colors** — a color picker per brand token, grouped and labeled in Hebrew ("צבע ראשי", "צבע פעולה", "רקע"). Show a **live preview** panel and a **contrast warning** next to any pair that fails AA. Warn, don't block — but make it loud.
- **Presets** — 3–4 ready-made palettes the admin can apply in one click, plus "reset to default." Most non-designers want to pick, not compose.
- **Typography** — a dropdown of 3–4 self-hosted OFL Hebrew families (Heebo, Assistant, Rubik, Noto Sans Hebrew) for display and body. Ship all of them; don't let the admin type an arbitrary font name.
- **Radius** — a slider or three-way toggle (sharp / soft / round) mapping to the radius scale. One control, whole-site effect.

### Placeholder logo

Until a real logo exists, generate a simple SVG wordmark from the site name using the display font, on the primary color. It must be **obviously provisional** — not a fake brand. Store it in `media` like any other logo so replacing it is an ordinary upload, not a code change.

**Acceptance:** I can change the primary color, the logo, the site name, and the font from `/admin`, and every page reflects it within seconds, with zero code changes and zero redeploy.

---

The client's sitemap — confirm with me before building. Hebrew slugs, URL-encoded, matching the client's own naming:

```
/                                 Homepage
/[studies-hub]                    Main program (hub)
  /[studies-hub]/[year-slug]      Year 1 / 2 / 3 sub-pages
/[trainings]                      Trainings index (dynamic collection)
/[trainings]/[slug]               Single training — landing + syllabus + registration
/[about]                          About + #lecturers anchor
/[about]/[person-slug]            Individual bios
/[community]                      Community
/[blog]                           Articles index, paginated
/[blog]/category/[slug]           Category archive
/[blog]/[slug]                    Single article
/gallery
/[podcast]                        (only if the client has one)
/[contact]
/[privacy]
/[accessibility-statement]
/search
```

Plus `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `404`, `500`.

Next.js must handle percent-encoded UTF-8 Hebrew slugs correctly in routing, `generateStaticParams`, and the sitemap — verify this early, it's a common source of breakage.

**Nesting decision:** articles under `/[blog]/[slug]` rather than at the root. Cleaner, and there's no legacy URL structure forcing our hand.

---

## 5. Homepage section inventory

A conversion-oriented homepage for a training organization. These are **standard patterns for the category** — build each one from the client's brand and content, not from anyone else's execution of the same pattern.

**Every section is a CMS-editable block** (text, images, links, visibility toggle, reorderable). Nothing hardcoded.

**Rule: if two entries differ only by their data, they are one block type, instantiated as many times as needed.** A block type is a shape (its zod schema), not an occurrence. Don't create `leader_message_a` and `leader_message_b`, or a block type whose existence depends on whether the client happens to have a podcast — that's content deciding to exist, not code. The corrected, de-duplicated block-type enum:

1. **Header** — logo, primary nav with dropdowns, search with live results, secondary CTA slot, hamburger → off-canvas mobile menu with social links.
2. **Hero** — eyebrow, H1, intro paragraph, phone CTA (`tel:`), primary CTA opening the registration modal, background media.
3. **Intro media** — heading + embedded video.
4. **Focus areas** — three-to-four cards naming what the program addresses.
5. **Pull quote** — quote mark + short statement.
6. **Leader message** *(repeatable)* — portrait or video, heading, body, link out. Instantiated once per principal the client has — one row, one block instance, ordered by `sort_order` like any other block. Two leaders means two `page_blocks` rows of this type, not two block types.
7. **Trainings carousel** — heading, intro, featured training cards (image, next-cohort date, title, excerpt, CTA), "all trainings" link. Fed by the `trainings` table.
8. **About** — icon, heading, subheading, rich-text body, CTA.
9. **Video testimonials / intro videos** — lightbox cards.
10. **Newsletter signup** — heading, copy, email field, consent text linking to the privacy policy.
11. **Testimonials slider** — avatar, quote, name. Auto-rotating, loops, pausable, keyboard accessible. **Only real, consented testimonials** — if the client has none yet, the block ships hidden.
12. **Lecturers grid** — photo, name, role, link to full list.
13. **Program stages stepper/accordion** — the client's own program structure: stages, each containing steps (number, title, body). Fully data-driven, non-uniform step counts per stage.
14. **Photo gallery** — masonry + lightbox.
15. **Podcast** — art, description, platform CTA. Its presence is a matter of whether a `podcast` block instance exists and is visible on the page — not a code branch. Client with no podcast: the block simply isn't added (or is added with `is_visible = false`).
16. **Community CTA** — heading, copy, CTA (WhatsApp group or equivalent).
17. **Latest articles** — heading, intro, 3 latest cards (image, category chip, title, excerpt, read more), "all articles" link. Fed by `posts`.
18. **Closing CTA band** — icon, heading, rich text, CTA.
19. **Footer** — logo, email, phone, social/community buttons, quick nav, trainings list, newsletter form with consent copy, physical address, legal links, credits.
20. **Global overlays** — registration modal, upcoming-cohorts panel, cookie consent banner, chat widget slot, accessibility toolbar.

Section order, visibility, and copy all come from the database.

> **Visual identity comes from §3.5, not from you and not from anyone else's site.** Build against the default tokens. Every color, the logo, and the site name are admin-editable, so nothing here is a permanent decision.

---

## 5.5. Data access strategy — **mock first, DB second**

A hard architectural requirement.

**Build the entire site and CMS against an in-memory mock data layer first.** Supabase is wired in only after the UI is complete and approved. The swap must be a **one-line config change** with zero component edits.

### The seam

`/lib/queries` is the only place any component fetches data. One interface, two implementations:

```ts
// lib/queries/types.ts — the contract. Written once; unchanged by the swap.
export interface DataSource {
  getPage(slug: string): Promise<Page | null>;
  listPosts(opts: { page?: number; perPage?: number; categorySlug?: string }): Promise<Paginated<PostSummary>>;
  getPost(slug: string): Promise<Post | null>;
  listTrainings(opts?: { featuredOnly?: boolean }): Promise<Training[]>;
  getTraining(slug: string): Promise<Training | null>;
  listLecturers(): Promise<Lecturer[]>;
  listTestimonials(): Promise<Testimonial[]>;
  getProgramStages(): Promise<ProgramStage[]>;   // stages with nested steps
  listScheduleEntries(): Promise<ScheduleEntry[]>;
  getSiteSettings(): Promise<SiteSettings>;
  getMenu(location: MenuLocation): Promise<MenuItem[]>;   // nested tree
  search(q: string): Promise<SearchResult[]>;
  // writes — needed from Phase 4 so the CMS is functional on mocks
  savePage(input: PageInput): Promise<Page>;
  createLead(input: LeadInput): Promise<{ id: string }>;
  // …one method per operation the UI needs
}

// lib/queries/index.ts
import { mockDataSource } from './mock';
import { supabaseDataSource } from './supabase';

export const db: DataSource =
  process.env.DATA_SOURCE === 'supabase' ? supabaseDataSource : mockDataSource;
```

Components import `db` and nothing else. **No component ever imports a Supabase client or a mock fixture directly.** If a component knows which backend answers it, the seam is broken — fix it.

### Rules that keep the swap honest

The mock must behave like a database, or Phase 5 becomes a rewrite.

1. **Types first, and they are the source of truth.** zod schemas + inferred types in `/lib/schemas`, modeled on §6. The SQL schema is derived *from* these later. Add `pnpm typecheck:schema` asserting generated DB types are assignable to the hand-written domain types.
2. **Everything is `async`.** No exceptions, even though mocks are synchronous.
3. **Artificial latency in dev** (`MOCK_LATENCY_MS`, ~80–250ms) so loading states, Suspense boundaries, and skeletons get built now.
4. **Pagination, filtering, sorting, search happen inside the data source.** Never in a component. `listPosts({ page: 2 })` returns page 2 — the mock slices it. Fetch-all-then-filter-in-JSX breaks on real data.
5. **Published-only by default**, exactly as RLS will enforce. `{ includeDrafts: true }` for the admin. **Public listing logic is two independent filters, both required: `status = 'published' AND published_at <= now()`.** A future-dated `published_at` on a `published` row is excluded by the date check; a `draft` row is excluded by the status check regardless of its date. Don't collapse these into one condition — a status-only or date-only filter passes the wrong rows in different scenarios, and each needs its own fixture to prove it's actually enforced (see §5.5 fixtures).
6. **No joins in components.** `getTraining()` returns its instructors nested and resolved — mirroring the SQL join.
7. **Simulate failure.** `MOCK_ERROR_RATE` (default 0) makes calls randomly reject, so error boundaries are real.
8. **Serializable returns** — plain objects, ISO date strings, matching what PostgREST hands back.

### Fixtures

- `/lib/mock/fixtures/*.ts` — one file per entity, typed against §6 domain types with `satisfies Post[]` so drift fails the build.
- **Content is placeholder for now, and the admin replaces it later.** Write it yourself, in natural Hebrew, appropriate to a psychotherapy training organization. Rules:
  - **Write it from scratch.** Do not copy, paraphrase, or lightly reword text from any existing website. Generic category-appropriate prose is easy to write — write it.
  - Placeholder text should be *plausible and shaped right* (correct length, tone, and structure per field) so layouts are tested honestly. Not lorem ipsum, not obviously silly.
  - **Fictional entities only.** Invented org name, invented lecturer names, invented testimonial authors. Never a real person's name, face, quote, or credential.
  - **Brand voice — gendered address:** Hebrew forces a gender choice that English doesn't. Default to **inclusive plural or gender-neutral phrasing** in body copy — paragraphs, bios, article text (e.g. "אנשים שמגיעים אלינו", "מי שמתחיל/ה תהליך" only where a slash is truly unavoidable, otherwise recast the sentence to avoid needing one). Reserve **slash-forms (את/ה, מוכן/ה) for short, direct second-person moments only** — button labels, CTA lines, form prompts — where directly addressing one reader matters more than prose flow. Do not stack multiple slash-forms in a single sentence; a paragraph dense with them is harder to read, not warmer. Applies uniformly across all fixture and future admin-authored copy.
  - Mark it as placeholder using `is_placeholder` — see the dedicated subsection below. This is a real, typed, DB-backed column, not fixture-only metadata.
  - **Nothing with a truth claim.** No statistics, success rates, graduate counts, accreditations, prices, or real dates. Where a field like that exists, leave it empty or use an obvious sentinel — never a plausible-looking number. A fake "92% success rate" that survives to production in a mental-health context is a real harm, not a typo.
  - Add a `pnpm check:placeholder` script that queries for `is_placeholder = true` and fails if `DATA_SOURCE=supabase` while any row still has it set. Wire it into the pre-launch checklist.
- **Program structure — deliberately non-uniform, deliberately not a known methodology.** Invent 5 stages with **2 / 4 / 3 / 2 / 3** steps (14 steps total). Do not use 6×12, or any count/shape that reads as a specific real program (e.g. the 12-step model) — the client enters their own structure later, and the placeholder must not look like a copy of one. The non-uniform counts are intentional: they exercise the stepper/accordion against both a 2-step stage and a 4-step stage, which a uniform grid would never catch.
- **Images:** client assets, or openly-licensed stock (Unsplash / Pexels), **downloaded and committed** to `/lib/mock/fixtures/images/` — never hotlinked, never a third-party host at runtime (no `picsum.photos` or similar). Record source URL, photographer, and license per image in `docs/licenses.md`. Fixture shape `{ id, url, alt_he, width, height }` matches future Storage rows, so Phase 6 just uploads the already-local files — no re-sourcing, no dead links. **Exception applies the same no-runtime-third-party-host rule, not a carve-out from it:** lecturer and testimonial avatars use generated abstract avatars (DiceBear or similar) — never a photograph of a real human, even a stock one, captioned as a fictional person — but the generated SVGs must be **downloaded and committed** to `/lib/mock/fixtures/images/` and **sanitized on the way in per §3.5's SVG-upload rules** exactly like any other SVG asset, never fetched from `api.dicebear.com` (or any generator host) at runtime.
- Realistic volume so pagination, sliders, and empty/overflow states are exercised: ≥ 12 posts across ≥ 3 categories, ≥ 5 trainings, ≥ 8 lecturers, ≥ 6 testimonials, the full stage/step set (5 stages, 2/4/3/2/3 steps), ≥ 6 schedule entries. Model **two leaders** (proving the `leader_message` block repeats) and **do include** a podcast entry (proving block presence is data-driven) — the harder case proves the pattern; a client with one leader and no podcast is just fewer rows later.
- **Extremes are measured in characters, by code, not estimated by eye.** Word count is the wrong unit for Hebrew (short words, no capitalization to signal length at a glance) — what actually breaks a layout is character count. Every fixture record built to exercise a length extreme must carry its measured character count as a comment, computed programmatically (e.g. a small script run over the fixture data, not eyeballed) so the annotation can't silently drift from the actual string. Targets: post title 15–20 chars (short) / 65–80 (long); excerpt 60–80 / 200–240; lecturer role 12–18 / 70–90.

### The `is_placeholder` flag — real column, not fixture metadata

`check:placeholder` has to run against the real database from Phase 5 onward, so this cannot live only in mock fixtures as a convention:

- **Schema:** every content table in §6 gets `is_placeholder boolean not null default false`. It's part of the domain type in `/lib/schemas`, returned by `db` like any other field — the mock and the future Supabase implementation both carry it.
- **Public visibility: none.** `is_placeholder` is admin-only metadata. No public component, page, or block may read or render it — it never reaches the public site's output, only the admin's.
- **Admin UI:** every placeholder record shows a badge in its list/edit view, and `/admin` shows a dismissible site-wide banner ("התוכן באתר הוא תוכן דמה, יש להחליפו לפני עלייה לאוויר") while any `is_placeholder = true` row exists.
- **Self-clearing:** saving a record through the CMS sets `is_placeholder = false` automatically. The admin never manages this flag directly — editing content is what de-placeholders it.
- **Launch gate:** `pnpm check:placeholder` queries for any row with `is_placeholder = true` and fails if `DATA_SOURCE=supabase`. Wired into the Phase 8 pre-launch checklist.

### Mock writes (Phase 4)

The CMS must be fully usable on mocks: an in-memory store seeded from fixtures, persisted to `.mock-db.json` (gitignored) so edits survive a restart. Add `pnpm mock:reset`. This gets the entire admin UX approved before a single Supabase row exists.

### The swap (Phase 5)

`supabaseDataSource` implements the same interface, method for method. Flip `DATA_SOURCE=supabase`. **If any file under `/app` or `/components` changes during Phase 5, the seam was wrong — stop and tell me.** The mock stays in the repo permanently: tests run against it, and contributors don't need DB credentials to run the site.

---

## 6. Data model

Design the schema yourself; it must cover the following. `uuid` PKs, `created_at`/`updated_at` with a trigger, `citext` where case-insensitivity helps. **Every content table below also gets `is_placeholder boolean not null default false`** — see §5.5's dedicated subsection for the full behavior (admin-only visibility, self-clearing on save, `check:placeholder` gate).

> **Read this in Phase 2 for the type definitions, but do not create the Supabase project until Phase 5.** Domain types in `/lib/schemas` are written from this section first; SQL is derived from those types later.

**Structural**
- `site_settings` — singleton. **Branding:** `site_name`, `tagline`, `logo_id`, `logo_dark_id`, `favicon_id`, `og_default_image_id`, `theme jsonb` (token overrides per §3.5), `font_display`, `font_body`, `radius_scale`. **Contact:** phone, email, address. **Links:** social, community, donation. **Misc:** GTM ID, footer credits.
- `menus` + `menu_items` — self-referencing `parent_id`, `label`, `href`, `sort_order`, `open_in_new_tab`, `location` (`header` | `footer_quick` | `mobile`).
- `pages` — `slug` (unique), `title`, `status` (`draft`|`published`), `published_at`, `seo_*`, `template`.
- `page_blocks` — `page_id`, `block_type` (enum matching the de-duplicated §5 list — one entry per distinct data shape, not per occurrence: `leader_message` and `podcast` are each a single block type, repeatable/optional via rows, not via separate types), `sort_order`, `is_visible`, `data jsonb`. **Validate `data` against a per-`block_type` zod schema on write.** TS discriminated union mirrors the enum.

**Content collections**
**General rule (applies to every table below): a field holding a quantity is numeric, full stop.** Units (minutes, hours, ₪) are a rendering/formatting concern applied at display time, never baked into the stored value as a string. `reading_time`, `academic_hours`, `sessions_count`, `duration`, `price` — audit every quantity field against this rule before writing fixtures; this list is illustrative, not exhaustive.

- `trainings` — `slug`, `title`, `excerpt`, `body`, `cover_image_id`, `starts_on`, `ends_on`, `meeting_day`, `meeting_time`, `academic_hours` (integer), `sessions_count` (integer), `instructors` (m2m → `lecturers`), `syllabus jsonb`, `price` (integer, smallest currency unit — agorot — or null if unset; never a formatted string), `registration_url`, `is_featured`, `status`, `sort_order`, SEO fields.
- `posts` — `slug`, `title`, `excerpt`, `body`, `cover_image_id`, `category_id`, `author_id`, `published_at`, `reading_time` (**integer, minutes** — never a formatted string; "X minutes" is a rendering concern, not stored data), `status` (`draft`|`published`), SEO fields. **Public listing logic (write this into §5.5's `listPosts`/mock behavior too): `status = 'published' AND published_at <= now()`.** A future `published_at` on an otherwise-published row must be excluded by the date check, not by `status` — these are two independent filters exercising two different code paths, and both need their own test fixture.
- `categories` — `slug`, `name`, `description`.
- `lecturers` — `name`, `role`, `bio`, `photo_id`, `sort_order`, `is_featured`, `is_visible boolean not null default false` (the row existing does not imply public display — `/about` and the lecturers grid both gate on this), optional `page_slug`, `consent_on_file` (boolean, admin-visible).
  **`CHECK (is_placeholder OR NOT is_visible OR consent_on_file)`** — a real lecturer cannot be publicly visible without consent on file. `is_featured` means "also surfaced on the homepage grid" and presupposes visibility: **`CHECK (NOT is_featured OR is_visible)`** — a lecturer can't be featured while hidden.
- `testimonials` — `author_name`, `quote`, `photo_id`, `sort_order`, `is_visible`, `consent_on_file`. **`CHECK (is_placeholder OR NOT is_visible OR consent_on_file)`** — a real testimonial cannot be visible without consent on file. This is a DB constraint, not just an admin-UI rule: fictional/placeholder rows are exempt so fixtures aren't blocked, but no real row can be clicked into visibility without consent already on file. **The constraint is a backstop, not the primary UX** — see §8 for how the Server Action must prevent an admin from ever hitting it.
- `program_stages` — `stage_number`, `title`, `subtitle`, `sort_order`.
- `program_steps` — `stage_id`, `step_number`, `title`, `body`, `sort_order`.
- `galleries` + `gallery_images` — ordered, with alt text.
- `podcast_episodes` — `title`, `description`, `spotify_url`, `published_at`, `duration` (integer, seconds), `cover_image_id`.
- `schedule_entries` — `day_label`, `start_date`, `end_date`, `time_range`, `program_name`, `cohort`, `sort_order`, `is_visible`.
- `media` — `storage_path`, `alt_he`, `width`, `height`, `mime_type`, `size_bytes`, `blurhash`, `license_note`, `uploaded_by`.

**Captured data**
- `leads` — `first_name`, `last_name`, `email`, `phone`, `source_page`, `utm jsonb`, `consent_at`, `status`, `notes`.
- `newsletter_subscribers` — `email` (unique), `consent_at`, `source`, `status`, `unsubscribe_token`.
- `contact_messages` — name, email, phone, message, `source_page`.

**Admin/system**
- `profiles` — mirrors `auth.users`: `role` (`admin`|`editor`|`viewer`), `full_name`, `avatar_id`.
- `revisions` — `entity_type`, `entity_id`, `snapshot jsonb`, `created_by`. Snapshot every save; restorable from the admin.
- `audit_log` — `actor_id`, `action`, `entity_type`, `entity_id`, `diff jsonb`.
- `redirects` — `from_path`, `to_path`, `status_code`; admin-editable, applied in middleware.

`search_vector tsvector` GENERATED columns + GIN indexes on `posts`, `trainings`, `pages` using Postgres FTS — site search runs on this. Index every FK and every `slug`.

---

## 7. Auth, roles, RLS

- Supabase Auth, email + password, with reset. **No public sign-up** — admins are created by an existing admin, server-side. TOTP MFA for `admin` if available; if not, tell me and stop.
- **RLS on every table. No exceptions.**
  - anon: `SELECT` only, only `status = 'published'` (and `is_visible = true`). **Zero** anon access to `leads`, `contact_messages`, `newsletter_subscribers`, `profiles`, `audit_log`, `revisions`.
  - anon `INSERT` only on `leads`, `contact_messages`, `newsletter_subscribers` — and via Server Actions with rate limiting, honeypot, and zod validation rather than direct client inserts. Never grant anon `SELECT` on those.
  - `editor`: CRUD on content tables; no users, no settings.
  - `admin`: everything.
- Middleware guards `/admin/**`. Role checked server-side on **every** mutation — never trust the client.
- Storage: public `media` bucket (anon read-only), private `uploads` bucket. Write policies require authenticated + role check.

---

## 8. Admin CMS

Route group `/admin`. Hebrew RTL, mobile-usable, built for a non-technical user.

**Screens**
- **Dashboard** — recent leads, subscriber count, latest edits, quick links.
- **Pages** — list, create, edit. Edit is a **block editor**: add/remove/reorder (drag & drop) §5 blocks, per-block form generated from its zod schema, visibility toggle, collapse/expand.
- **Live preview** — Next.js Draft Mode at `/api/preview?secret=…&slug=…`, opening the real front-end with unpublished content.
- **Trainings / Posts / Lecturers / Testimonials / Program stages / Galleries / Podcast / Schedule** — CRUD lists: search, status filter, drag-to-reorder, bulk publish, duplicate.
- **Media library** — drag-drop upload, client-side resize before upload, **mandatory Hebrew alt text**, license note field, search, replace-in-place, usage list ("used on 3 pages"), safe delete with in-use warning.
- **Menus** — drag-drop nested builder for header/footer/mobile.
- **Branding** — logo, site name, tagline, colors with live preview + contrast warnings, presets, typography, radius. Per §3.5.
- **Site settings** — contact details, links, GTM, credits. Form-driven singleton.
- **Leads / Messages / Subscribers** — table, filters, detail drawer, notes, status, **CSV export**.
- **Redirects** — CRUD.
- **Users** — invite, set role, deactivate (admin only).
- **Revisions** — per entity: version list, diff, restore.

**Behavior**
- Every mutation is a **Server Action** with zod validation + role check. Optimistic UI where safe.
- Draft vs Published for pages, posts, trainings. Publish triggers revalidation (§10).
- Autosave drafts ~10s; warn on navigate-away with unsaved changes.
- Slug auto-generated from the Hebrew title (stays Hebrew, no transliteration), uniqueness-checked, editable, with a warning + auto-redirect offer when changing a published slug.
- Image fields: pick from library or upload inline; show the aspect ratio the block expects.
- **Consent-gated de-placeholdering (testimonials & lecturers):** `consent_on_file` is a required checkbox on both forms. Saving through the CMS always sets `is_placeholder = false` per §5.5 — but if the admin saves with `consent_on_file` unchecked and `is_visible` checked, **the Server Action must force `is_visible = false` before the write**, save successfully, and surface: *"ההמלצה נשמרה כמוסתרת. לא ניתן להציג המלצה של אדם אמיתי ללא אישור בכתב. סמנו את אישור ההסכמה כדי להציג אותה."* (equivalent copy for lecturers). The §6 `CHECK` constraints are the backstop for direct DB access or a bug in this logic — **the admin must never see the constraint fire as a raw error.** Cover this exact path with a test: save a de-placeholdered testimonial with consent unchecked and visibility checked, assert the row saves, assert `is_visible = false`, assert the Hebrew message is shown.
- All admin copy in Hebrew. Friendly errors, never raw Postgres messages.

---

## 9. SEO (new site — no legacy to preserve)

This is a fresh domain with no existing authority. Plan accordingly.

- Per-entity SEO fields: title, description, canonical, OG image, `noindex` toggle. Sensible defaults via `generateMetadata`.
- JSON-LD: `Organization` + `WebSite` (with `SearchAction`) globally; `Article` on posts; `Course` on trainings; `BreadcrumbList`; `FAQPage` where FAQs exist.
- Dynamic `sitemap.xml` from the DB (published only), `robots.txt`, RSS for the blog.
- `lang` = `he-IL`. **Canonical host: apex, `https://[DOMAIN]`, 301 from www.** Pick it now and never change it.
- Get me the client's keyword targets before writing any meta defaults. If they have an SEO consultant, loop them in at Phase 1 — not at launch.
- Set up Search Console + Bing Webmaster before DNS cutover, submit the sitemap on day one.

---

## 10. Rendering & caching

- Public pages **static by default** (`generateStaticParams`), data fetched in Server Components via `db`.
- Tag every fetch (`next: { tags: ['page:slug', 'posts', 'trainings', …] }`).
- Publishing from the admin calls `revalidateTag`/`revalidatePath` in the Server Action. Live in seconds, no rebuild.
- `POST /api/revalidate` (secret-protected) so a Supabase webhook can trigger revalidation if content changes outside the app.
- Draft Mode bypasses cache for previews.

---

## 11. Forms & integrations

- **Registration modal**: first name, last name, email, phone, consent checkbox → `leads`. Israeli phone validation. Honeypot + IP rate limit + **Cloudflare Turnstile**. On success: thank-you state, GTM event, notification email to `[OFFICE_EMAIL]`.
- **Newsletter** (homepage + footer): email + consent → `newsletter_subscribers`, upsert on conflict, `/unsubscribe/[token]` route. **[DECIDE: DB-only + CSV export, or sync with [PROVIDER]]**.
- **Contact form** → `contact_messages` + notification email.
- Transactional email via Resend, from `[FROM_ADDRESS]`, React Email templates, Hebrew RTL.
- Community/social/donation URLs are CMS-managed, never hardcoded.
- Chat widget (if any): load on interaction or idle only.
- **Privacy:** the consent checkbox is not decorative. Store `consent_at`. The privacy policy must be real and drafted by the client — do not write legal text for them, and do not copy a policy from another site. Flag it in `docs/content-needed.md`.

---

## 12. Project structure

```
/app
  /(site)          # public, RTL layout
  /(admin)/admin   # CMS, middleware-guarded
  /api             # revalidate, preview, unsubscribe, og
/components
  /blocks          # one component per page_blocks.block_type
  /ui              # shadcn
  /admin
/lib
  /queries
    types.ts       # the DataSource interface — the seam (§5.5)
    index.ts       # picks impl from DATA_SOURCE
    /mock          # in-memory impl + write store
    /supabase      # real impl — does not exist before Phase 5
  /mock
    /fixtures      # posts.ts, trainings.ts, lecturers.ts, media.ts, …
    store.ts       # writes, persisted to .mock-db.json
  /schemas         # zod — source of truth for types, forms, block validation, DB writes
  /supabase        # server.ts, client.ts, admin.ts (service role, server only). Phase 5.
/supabase
  /migrations      # Phase 5
  /seed            # loads /lib/mock/fixtures into Postgres
/types             # domain types + generated DB types (Phase 5)
/docs              # content-needed.md, licenses.md, design-tokens.md, cms-guide-he.md
```

`/lib/supabase` and `/lib/queries/supabase` must not exist before Phase 5. If you want to create them earlier, you're out of order.

---

## 13. Environment variables

```
# --- always ---
NEXT_PUBLIC_SITE_URL
DATA_SOURCE=mock                 # mock | supabase  ← the swap switch (§5.5)

# --- mock phase only ---
MOCK_LATENCY_MS=150
MOCK_ERROR_RATE=0

# --- Phase 5 onward ---
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only
REVALIDATE_SECRET
PREVIEW_SECRET
RESEND_API_KEY
NOTIFICATION_EMAIL_TO
NEXT_PUBLIC_GTM_ID
TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY
```

The app must boot and run fully with **only** the "always" block set. A missing Supabase var crashing the site while `DATA_SOURCE=mock` is a bug. Validate env with zod at startup, conditionally on `DATA_SOURCE`. Commit `.env.example`; never real values.

---

## 14. Deployment

- Vercel project. `main` → production, PRs → preview deployments.
- Two Supabase projects: `staging`, `production`. Migrations via Supabase CLI in CI.
- Region closest to Israel (`fra1` or `cdg1`) for both Vercel functions and Supabase.
- Domain + www→apex 301, HTTPS, HSTS.
- Security headers in `next.config.ts`: CSP (explicitly allow GTM/YouTube/Supabase/Turnstile), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Vercel Analytics + Speed Insights on.
- Launch: staging → client content review → client sign-off → DNS → monitor 404s and Search Console for 30 days.

---

## 15. Content

The site launches on placeholder content (§5.5) and the admin replaces it through the CMS. That's the whole point of the build — no developer should ever touch a string.

Maintain `docs/content-needed.md` as a live handover checklist for whoever fills it in:

| Entity | Needed before launch | Status |
|---|---|---|
| Branding | Logo (SVG), site name, tagline, colors | ☐ placeholder |
| Site settings | Phone, email, address, social URLs | ☐ placeholder |
| Homepage | Copy for each §5 block | ☐ placeholder |
| Trainings | Per course: title, excerpt, body, dates, hours, syllabus, price, cover | ☐ placeholder |
| Lecturers | Name, role, bio, photo, **consent** | ☐ placeholder |
| Testimonials | Quote, name, photo, **written consent per person** | ☐ placeholder |
| Program stages | The organization's own stage/step structure and text | ☐ placeholder |
| Articles | ≥ 12 for a credible blog | ☐ placeholder |
| Legal | Privacy policy, accessibility statement — the client's counsel, not us | ☐ **missing** |
| Photos | Client's own, or licensed stock recorded in `docs/licenses.md` | ☐ placeholder |

**Placeholder images:** openly-licensed stock (Unsplash / Pexels), source recorded in `docs/licenses.md`, correct dimensions and aspect ratios so layouts are honest. For lecturer and testimonial avatars use generated abstract avatars rather than photographs of real people — a stock photo of a real human captioned as a fictional graduate is exactly the thing to avoid.

**Two things that cannot go live on placeholder**, regardless of schedule pressure: the privacy policy (it's a legal document and drives the consent flow), and any testimonial or person's photo (consent). Both must be flagged loudly at the pre-launch check.

---

## 16. Phases

**Stop and get my approval at the end of each.**

0. **~~Brand & direction~~ — skipped.** Tokens are defined in §3.5; content is placeholder per §5.5. Nothing is blocked. Go straight to Phase 1.
1. **Placeholder content & fixtures** — write the Hebrew placeholder copy and build `/lib/mock/fixtures/`, typed, with `_placeholder: true` on every record. Source stock imagery, record it in `docs/licenses.md`. Generate the provisional SVG wordmark. Draft `docs/content-needed.md`. Stop and show me the fixtures before writing app code.
2. **Foundation (mock)** — repo, Next.js + Tailwind RTL, self-hosted Heebo + Assistant, the §3.5 token layer, zod schemas + domain types (§6), the `DataSource` interface (§5.5), `mockDataSource` reads, admin shell with stubbed auth. **No Supabase project. Do not install `@supabase/*`.**
3. **Public site (mock)** — homepage blocks first, then page types, then collections. Everything through `db`, every color through a token. Loading/empty/error states included. Whole public site works with no database.
4. **CMS (mock)** — full admin per §8 including the Branding screen, writes to `.mock-db.json`. I click through and approve the entire admin UX here. Auth stubbed with a dev role switcher.
5. **Supabase & swap** — create the projects. Derive SQL from `/lib/schemas`, migrations, RLS (§7), storage buckets. Implement `supabaseDataSource` against the unchanged interface. Seed from fixtures. Real Supabase Auth replaces the stub. Flip `DATA_SOURCE=supabase`. **Proof: `git diff phase-4..HEAD --stat -- app/ components/` is empty.**
6. **Media** — upload fixture images to Storage, rewrite URLs, blurhashes, SVG sanitization on upload.
7. **Polish** — axe + manual keyboard pass + screen reader, Lighthouse, SEO, security headers, E2E, `docs/cms-guide-he.md`.
8. **Launch** — only when I say so. Vercel, DNS, Search Console, real content, `pnpm check:placeholder` green.

**Also deliver:** README with local setup, a written walkthrough of the admin, a rollback plan.

---

## 17. Acceptance criteria

- [ ] **`DATA_SOURCE=mock` with no Supabase env vars: `pnpm dev` boots, the whole site and admin work.**
- [ ] **Flipping `DATA_SOURCE` produces zero visual or behavioral difference and required zero component changes.**
- [ ] **`grep -r "@supabase" app/ components/` returns nothing.**
- [ ] Generated DB types are assignable to hand-written domain types (`pnpm typecheck:schema`).
- [ ] **I can change the primary color, the logo, the site name, and the font from `/admin`, and every page reflects it in seconds — zero code changes, zero redeploy.**
- [ ] **`grep -rE "#[0-9a-fA-F]{6}" app/ components/` returns nothing.** No hex outside the token layer. Same for Tailwind arbitrary colors.
- [ ] Color overrides are injected server-side in the initial HTML — no flash of the default palette.
- [ ] Every default token pair passes WCAG AA; the admin warns on failing custom pairs.
- [ ] Uploaded SVGs are sanitized (no `<script>`, no event handlers, no external refs).
- [ ] `pnpm check:placeholder` fails while placeholder content is present and `DATA_SOURCE=supabase`.
- [ ] Every §5 section is editable and reorderable in `/admin`; changes live without a redeploy.
- [ ] RLS on for every table; the anon key cannot read `leads`, `contact_messages`, `newsletter_subscribers`, or `profiles`. Proven by a test.
- [ ] Lighthouse mobile ≥ 90 across all four categories on `/`.
- [ ] axe: zero critical/serious issues on every template; full keyboard traverse works.
- [ ] Registration, newsletter, and contact forms persist and notify; `consent_at` recorded.
- [ ] Hebrew search returns relevant results.
- [ ] Draft preview works; publish → live in under 10 seconds.
- [ ] `pnpm build` clean; strict TS with zero `any` in app code; ESLint clean.
- [ ] E2E: admin login → edit a headline → publish → assert on the public page.
- [ ] **`docs/licenses.md` accounts for every font and every image shipped.**
- [ ] **No text, image, or asset in the repo originates from another company's website.**

---

## 18. Rules for you, the agent

- **Plan before you code.** Show the plan for the current phase; wait for a go.
- **Never copy from another site.** Not text, not images, not CSS, not a color palette. Structural patterns are shared vocabulary; executions are owned. If unsure which side of the line something falls on, ask.
- **Placeholder content is written by you, from scratch, about a fictional organization.** Plausible in shape, never true in claim. No statistics, success rates, graduate counts, accreditations, or real people. Flag every record `_placeholder: true`.
- **No hardcoded brand.** No hex outside the token layer, no site name in a string literal, no logo in `/public`. If it's brand, it's in the database.
- **No real person's name or face** without client-confirmed consent.
- **Do not touch Supabase before Phase 5.** No project, no `@supabase/*` install, no client code. If you think you need it earlier, say why and wait.
- **Never let a component know where its data comes from.** Everything through `db`. No exceptions, including "just for now."
- Never weaken RLS or reach for the service-role key to make something work client-side.
- Small, reviewable commits. Conventional messages. One PR per phase.
- If a requirement is ambiguous, **ask**. Don't guess.
- If something makes an acceptance criterion unachievable, say so immediately with options — don't quietly downgrade it.
