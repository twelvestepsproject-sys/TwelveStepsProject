# Licenses — fonts and images

Every font and every image shipped in the repo, per §17 acceptance criteria. Stock images are downloaded and committed to `/lib/mock/fixtures/images/`, never hotlinked.

## Fonts

| Family | License | Source | Used for |
|---|---|---|---|
| Heebo | SIL Open Font License 1.1 | Google Fonts | display / headings |
| Assistant | SIL Open Font License 1.1 | Google Fonts | body |
| Rubik | SIL Open Font License 1.1 | Google Fonts (`fonts.gstatic.com/s/rubik/v31/iJWKBXyIfDnIV7nDrXyi0A.woff2`, hebrew subset, variable font — one file covers weights 400–800) | Branding screen typography option (`/admin/branding`) |
| Noto Sans Hebrew | SIL Open Font License 1.1 | Google Fonts (`fonts.gstatic.com/s/notosanshebrew/v50/or30Q7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaePiWTNzENg.woff2`, hebrew subset, variable font — one file covers weights 400–800) | Branding screen typography option (`/admin/branding`) |

Rubik and Noto Sans Hebrew woff2 files were downloaded (2026-07-17, same method as Heebo/Assistant: Google Fonts CSS2 API with a modern-browser user agent to get the woff2/hebrew-subset response, direct `fonts.gstatic.com` URLs, downloaded and committed to `/public/fonts` — never fetched from Google's CDN at runtime) and are self-hosted via `next/font/local` in `lib/fonts.ts` (`fontRubik`, `fontNotoSansHebrew`), closing the gap flagged in the previous pass. Both are variable fonts on Google Fonts' current release, so a single file, declared with a weight range (`"400 800"`), covers all four static weights the rest of the type system uses — no separate per-weight files needed.

## Images

| Local file | Source | Photographer | License | Used for |
|---|---|---|---|---|
| `lib/mock/fixtures/images/training-yesodot-hakesher-cover.jpg` | [Unsplash](https://unsplash.com/photos/two-people-holding-gray-mugs-at-table-K8XYGbw4Ahg) | Priscilla Du Preez | Unsplash License (free to use) | Cover image, training `yesodot-hakesher` |
| `lib/mock/fixtures/images/intro-media-poster.jpg` | [Unsplash](https://unsplash.com/photos/a-group-of-people-in-a-room-with-a-projector-screen-1-aA2Fadydc) | Quilia (@heyquilia) | Unsplash License (free to use) | Poster/thumbnail image, homepage `intro_media` block |
| `lib/mock/fixtures/images/gallery-workshop-room.jpg` | [Unsplash](https://unsplash.com/photos/YlPCH249qHE) | Timur Shakerzianov (@shaker_jpg) | Unsplash License (free to use) | `photo_gallery` block — fixture gallery `hachvana-clip-hits` (workshop room, people seated in a circle) |
| `lib/mock/fixtures/images/gallery-group-circle-indoor.jpg` | [Unsplash](https://unsplash.com/photos/zAUFtGIWc0E) | RU Recovery Ministries (@rurecoveryministries) | Unsplash License (free to use) | `photo_gallery` block — group seated indoors in a circle |
| `lib/mock/fixtures/images/gallery-group-circle-outdoor.jpg` | [Unsplash](https://unsplash.com/photos/1tAtO-9HYNM) | Dorota Trzaska (@dtrzaska1) | Unsplash License (free to use) | `photo_gallery` block — group seated outdoors on grass in a circle |
| `lib/mock/fixtures/images/gallery-hands-together.jpg` | [Unsplash](https://unsplash.com/photos/Zyx1bK9mqmA) | Hannah Busing (@hannahbusing) | Unsplash License (free to use) | `photo_gallery` block — hands stacked together, community/support motif |
| `lib/mock/fixtures/images/gallery-lecture-hall.jpg` | [Unsplash](https://unsplash.com/photos/Z_Z_2-GMD9E) | Vitaly Gariev (@silverkblack) | Unsplash License (free to use) | `photo_gallery` block — lecture/seminar room setting |

*(Remaining cover images for posts and other trainings will be added here as they're downloaded during full fixture-volume authoring.)*

## Generated avatars (lecturers & testimonials)

Per §5.5, lecturer and testimonial avatars are generated abstract avatars (DiceBear or similar) — never a photograph of a real human. Generated SVGs are downloaded, committed to `/lib/mock/fixtures/images/`, and sanitized on the way in per §3.5's SVG rules, exactly like any other SVG asset — never fetched from a generator host at runtime. All fetched from `api.dicebear.com/9.x/notionists/svg?seed=<name>` at build time only; verified on download to contain no `<script>`, `onload`, or `onerror` content (they were already clean, since DiceBear's own output is inert markup+paths — a real Storage upload would still run them through the same sanitizer as any other SVG per §3.5, as a defense-in-depth backstop, not because these specific files needed it).

| Local file | Generator seed | Used for |
|---|---|---|
| `lib/mock/fixtures/images/lecturer-noa-sagi.svg` | `noa-sagi` | Lecturer avatar — נועה שגיא |
| `lib/mock/fixtures/images/lecturer-daniel-aviram.svg` | `daniel-aviram` | Lecturer avatar — דניאל אבירם |
| `lib/mock/fixtures/images/lecturer-shira-nachmani.svg` | `shira-nachmani` | Lecturer avatar — שירה נחמני |
| `lib/mock/fixtures/images/lecturer-yael-barkai.svg` | `yael-barkai` | Lecturer avatar — יעל ברקאי |
| `lib/mock/fixtures/images/lecturer-itamar-cohen-levy.svg` | `itamar-cohen-levy` | Lecturer avatar — איתמר כהן-לוי |
| `lib/mock/fixtures/images/lecturer-maayan-peretz.svg` | `maayan-peretz` | Lecturer avatar — מעיין פרץ |
| `lib/mock/fixtures/images/lecturer-tomer-ashkenazi.svg` | `tomer-ashkenazi` | Lecturer avatar — תומר אשכנזי |
| `lib/mock/fixtures/images/lecturer-rotem-gil.svg` | `rotem-gil` | Lecturer avatar — רותם גיל |
| `lib/mock/fixtures/images/testimonial-m.svg` | `testimonial-m` | Testimonial avatar — מ. |
| `lib/mock/fixtures/images/testimonial-r.svg` | `testimonial-r` | Testimonial avatar — ר. |
| `lib/mock/fixtures/images/testimonial-d.svg` | `testimonial-d` | Testimonial avatar — ד. |
| `lib/mock/fixtures/images/testimonial-s.svg` | `testimonial-s` | Testimonial avatar — ש. |
| `lib/mock/fixtures/images/testimonial-y.svg` | `testimonial-y` | Testimonial avatar — י. |
| `lib/mock/fixtures/images/testimonial-a.svg` | `testimonial-a` | Testimonial avatar — א. |
| `lib/mock/fixtures/images/testimonial-t.svg` | `testimonial-t` | Testimonial avatar — ת. |
