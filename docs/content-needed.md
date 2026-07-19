# Content needed before launch

Live handover checklist per §15 of `docs/BUILD_SPEC.md`. Placeholder content ships now; every row below must be replaced before `pnpm check:placeholder` can pass.

## BUG — public forms don't actually submit (found in live Supabase testing, 2026-07-19) — **FIXED 2026-07-19, partially deferred**

Real-world testing against the live Supabase-backed site surfaced that neither the **newsletter signup** (`components/blocks/newsletter-signup.tsx`) nor the **registration modal** (`components/layout/registration-modal.tsx`) actually persist a submission anywhere — both are, by original design, UI shells with no Server Action wired up ("that's explicitly Phase 4," per each file's own header comment), but this never got flagged as an outstanding item once Phase 4 (admin CMS) wrapped, so it silently fell through the cracks. Confirmed directly against Postgres: a real newsletter signup and a real "התעניינות" submission through the live site produced **zero new rows** in `newsletter_subscribers`/`leads` — the newsletter form has no `action` at all, and the registration modal explicitly shows a "not yet wired up" message on submit rather than pretending to succeed (that part was handled honestly, at least). The contact form at `/tsor-kesher` had the same gap (form markup only, no Server Action).

### What's fixed now

- **`lib/actions/public-forms.ts`** (new) — `submitRegistrationAction`, `submitNewsletterAction`, `submitContactAction`. Each: honeypot check (silent no-op on a filled hidden `website` field — a caught bot gets the same success response a real user would, so it learns nothing), in-memory IP rate limit (`lib/actions/rate-limit.ts`, 5 requests / 10 min / IP, keyed per form), zod validation against the existing `leadInputSchema` / `newsletterSubscribeInputSchema` / `contactMessageInputSchema` (no new schemas written), then the real `db.createLead` / `db.subscribeNewsletter` / `db.createContactMessage` call.
- **`components/blocks/newsletter-signup.tsx`** + new **`components/blocks/newsletter-form.tsx`** — the block itself stays a Server Component; the form/submit logic is isolated into a small client island using React 19's `useActionState`/`useFormStatus`, per the modern Next 15+ pattern instead of manual fetch/onSubmit. Covers both the homepage instance and the footer's reuse of the same block (`components/layout/site-footer.tsx`).
- **`components/layout/registration-modal.tsx`** — the "not yet wired up" placeholder message is gone; the form now calls `submitRegistrationAction` via `useActionState`, keeping the existing open/close behavior and Israeli-phone `pattern` hint intact. Success and error states render in place of the old always-shown placeholder.
- **`app/(site)/tsor-kesher/page.tsx`** + new **`app/(site)/tsor-kesher/contact-form.tsx`** — same treatment, wired to `submitContactAction`.
- **Bug found and fixed *during* live verification, in already-existing Phase 5 code** (`lib/queries/supabase/index.ts`): `createLead`/`subscribeNewsletter`/`createContactMessage` each chained `.select("id").single()` after their insert/upsert to read back the generated id. That silently requires anon **SELECT** permission on the row just written — which §7 correctly and deliberately denies anon on all three tables. Every real anon submission was therefore failing *after* Postgres accepted the write (or, for `subscribeNewsletter`, failing to write at all on a re-subscribe, since a real Postgres `upsert(...).onConflict()` performs an UPDATE on conflict, and anon has no UPDATE grant either — same §7 reasoning). Fixed by generating the row `id` client-side (`crypto.randomUUID()`) so no read-back is ever needed, and by treating a unique-violation (`23505`) on newsletter re-subscribe as success without attempting an update. **RLS itself was not touched or weakened** — anon still cannot SELECT or UPDATE any of these three tables; the fix is entirely in how the existing, correctly-scoped INSERT policies are used.

### Still deferred (deliberately, per client decision — see task scope)

- **Cloudflare Turnstile** — no site key exists yet. Integration point is marked with a `TODO(turnstile)` comment in `lib/actions/public-forms.ts` (module-level, plus one per action) showing exactly where server-side `siteverify` token verification would slot in. Not stubbed with a fake always-pass check.
- **GTM event on registration success** — no GTM container is wired up anywhere in this project yet (`site_settings.gtm_id` exists as a schema field but nothing reads it into an actual GTM script). `TODO(gtm)` comment in `registration-modal.tsx` marks where a `dataLayer.push(...)` would fire once real GTM exists.
- **Resend notification email** (all three forms) — no `RESEND_API_KEY` in `.env.local` yet. `TODO(resend)` comments mark the integration point in each Server Action; the DB write (the part that had to genuinely work today) is unconditional and does not depend on email being configured.

### Verification (live, against the real staging Supabase DB)

Installed `@playwright/test` (already the fixed E2E tool per spec §2, just not yet installed) to drive `pnpm dev` with a real browser. All three forms confirmed to create real rows (then deleted as test cleanup); honeypot confirmed to suppress a write when filled; rate limiting confirmed to trip after 5 requests/10-min/IP and reject the 6th+. No test rows were left behind in the DB.

## Real org name received — not yet applied to the codebase

**Client has supplied the real organization name: "הינני — המכללה לפסיכותרפיה חוייתית."** This replaces the placeholder "מכללת אשד" used throughout every fixture, component copy reference, and this doc so far. **Not yet applied anywhere in the code** — every occurrence of "מכללת אשד" (site_settings, fixture Hebrew copy referencing the org by name, `docs/cms-guide-he.md`, etc.) still needs a find-and-replace pass plus a fresh tagline once the client supplies one (the current tagline "לזוז, בקצב שלך" was written for the placeholder identity and should be re-confirmed against the real brand). Flagging this explicitly so it's a deliberate task, not a silent rename.

| Entity | Needed before launch | Status |
|---|---|---|
| Branding | Logo (SVG), site name, tagline, colors | ☐ placeholder |
| Site settings | Phone, email, address, social URLs | ☐ placeholder |
| Homepage | Copy for each §5 block | ☐ placeholder |
| Intro media video | Real YouTube video for the homepage `intro_media` block — none exists for this fictional org. **The fixture currently points at a real, independent YouTube creator's video ID (`Vk3poOqB9cY`) as DEV/TEST DATA ONLY, to exercise the click-to-play mechanism end-to-end.** This is NOT owned by or licensed to the fictional org and must NEVER be shown as real site content — swap it back to `video_url: null` (or a real, rights-cleared video) before any content review, CMS demo, or launch checklist pass. | ☐ **missing — test data in place, must be removed before ship** |
| Trainings | Per course: title, excerpt, body, dates, hours, syllabus, price, cover | ☐ placeholder |
| Lecturers | Name, role, bio, photo, **consent** | ☐ placeholder |
| Testimonials | Quote, name, photo, **written consent per person** | ☐ placeholder |
| Program stages | The organization's own stage/step structure and text | ☐ placeholder |
| Articles | ≥ 12 for a credible blog | ☐ placeholder |
| Legal | Privacy policy, accessibility statement — the client's counsel, not us | ☐ **missing** |
| Photos | Client's own, or licensed stock recorded in `docs/licenses.md` | ☐ placeholder |

## Phase 3 page-types pass — routes, slugs, and judgment calls

Routes built this pass (§4 sitemap): `/hachsharot` + `/hachsharot/[slug]`,
`/odot` + `/odot/[person-slug]`, `/tochnit-halimudim` + `/tochnit-halimudim/[year-slug]`,
`/blog` + `/blog/category/[slug]` + `/blog/[slug]`, `/gallery`, `/kehila`,
`/podcast`, `/tsor-kesher`, `/privacy`, `/accessibility-statement`, `/search`,
`/sitemap.xml`, `/robots.txt`, `/rss.xml`, branded 404.

**Slugs chosen for routes with no existing fixture link** (per the client-approved
naming pattern already in `lib/mock/fixtures/pages.ts`/`menus.ts`): community =
`/kehila`, podcast = `/podcast` (literal, matching `/gallery` staying literal),
contact = `/tsor-kesher`, accessibility statement = `/accessibility-statement`.
All four were already present in `lib/mock/fixtures/menus.ts`'s header/footer/mobile
nav from earlier work — reused as-is rather than re-derived, so the nav's existing
links now resolve instead of 404ing.

**Studies hub — data-model gap, flagged not fabricated:** §6 has no schema for a
"studies hub" hierarchy distinct from `trainings` + `program_stages`. `/tochnit-halimudim`
is built as a `page_blocks` composition (same pattern as the homepage), reusing
existing block types — the multi-year program IS one of the fixtured trainings
(`tochnit-rav-shnatit-lehachvanat-metaplim`). The year sub-pages
(`/tochnit-halimudim/[year-slug]`) have **no real content model** — a small,
explicitly-flagged, additive fixture (`lib/mock/fixtures/study-years.ts`, exposed
through `db.listStudyYears()`) provides just enough shape (slug/label/description)
to prove the routing mechanics honestly. ☐ **needs a real decision**: does the
client's actual multi-year program need first-class admin-editable per-year content
(syllabus, staff, dates per year), or does the `trainings` collection already cover
it adequately? Flag for Phase 4/5 planning, not decided here.

**About page — added `odot` page fixture**, reusing `about` + `lecturers_grid`
block types (no new schema needed) — see `lib/mock/fixtures/pages.ts`'s `odotBlocks`.

## Naming risk — flag before shipping

**Placeholder org name "מכללת אשד" is two letters removed from "מכללת אשדוד,"** a real municipal nonprofit in Ashdod that markets its own "הכשרות מקצועיות" (professional trainings). Confirmed via independent search by the client. Not a collision on the exact name, but close enough in the same sector that it must not go live as the client's real identity — this is placeholder-only, to be fully replaced (name, tagline, and all copy referencing it) once the client supplies their real brand per §3.5.

## Naming history (for context, not action)

Two earlier placeholder-name candidates were rejected before reaching this point:
- "בית נתיב" — collided with a real nonprofit, "נתיב – מרכז להתפתחות רגשית" (emotional-treatment centers).
- "עוגן" / "אבני דרך" (considered, not shown to client) — both real, active therapy/facilitator-training organizations.

"מכללת אשד" was the client-approved pick after search confirmed no exact-name collision; the Ashdod near-miss above is a residual risk to track, not a reason to re-pick, since it's placeholder content, not the launch identity.
