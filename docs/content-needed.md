# Content needed before launch

Live handover checklist per §15 of `docs/BUILD_SPEC.md`. Placeholder content ships now; every row below must be replaced before `pnpm check:placeholder` can pass.

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
