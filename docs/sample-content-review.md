# Sample placeholder content — מכללת אשד (Michlelet Eshed)

Tagline: **לזוז, בקצב שלך.**

**Naming risk flagged in `docs/content-needed.md`:** "מכללת אשד" is two letters from "מכללת אשדוד," a real municipal training nonprofit. Not an exact collision, acceptable for local placeholder use, but logged so it's replaced (not accidentally shipped) once the client's real brand lands.

All records below carry `is_placeholder: true`. Fictional organization, fictional people, no truth claims, no statistics. Quantity fields are numeric with units as documentation only. Dates are fixed and deterministic. Length extremes are measured in **characters, by code** (see the measurement script referenced at the end), not estimated by eye. Voice: inclusive/neutral in body copy, slash-forms reserved for short direct CTAs only.

---

## 1. Post — extreme: long title (measured 80 chars, target 65–80 ✓)

**slug:** `hapachad-lehatchil`
**title:** הפחד להתחיל ולמה זה בעצם סימן טוב שמשהו חשוב עומד לקרות בחיים שלך, לא מכשול בדרך *(80 chars)*
**category:** תהליך אישי
**excerpt:** הפחד לא אומר שמשהו לא בסדר. הוא אומר שמשהו חשוב עומד לקרות בקרוב. *(65 chars, target 60–80 ✓)*
**body (rich text, abridged):**

> יש רגע שקורה לרוב האנשים שפונים אלינו: יושבים מול הדף הזה, מול הטופס הזה, ומשהו עוצר בדיוק לפני הצעד האחרון.
>
> זו לא חולשה, וזה לא חוסר מוכנות. זה בדרך כלל סימן שמשהו כבר התעורר בפנים — הוא פשוט עוד לא בטוח שאפשר לסמוך על התהליך.
>
> במכללת אשד פוגשים את השאלה הזו כל שבוע. אין הבטחה שהפחד ייעלם ביום הראשון. יש הבטחה שאף אחד לא צריך להתמודד איתו לבד.
>
> מי שמזהה את עצמו בשורות האלה — זה הזמן לדבר איתנו, גם בלי תשובות מוכנות. מספיק שיש שאלה.

**reading_time:** `4` *(integer, minutes)*
**status:** `published`
**published_at:** `2025-11-03T09:00:00Z`

---

## 2. Post — extreme: short title (17 chars, target 15–20 ✓), tiebreak pair

**slug:** `lifamim-tsarich-laatzor`
**title:** לפעמים צריך לעצור *(17 chars)*
**category:** זוגיות ומשפחה
**excerpt:** יש תקופות שבהן הדרך הכי נכונה קדימה היא לא להאיץ, אלא לעצור לרגע ולשאול מה באמת קורה כאן, לפני שממשיכים לרוץ באותו כיוון מתוך הרגל ולא מתוך בחירה אמיתית, וזה כשלעצמו כבר צעד משמעותי בתהליך. *(189 chars, target 200–240 — close but under; will extend by one clause when writing full volume)*
**body (abridged):** עצירה היא לא ויתור. היא הזדמנות לבדוק אם הכיוון עדיין נכון.
**reading_time:** `3`
**status:** `published`
**published_at:** `2026-02-14T09:00:00Z` *(same calendar day as the post below — tests ordering tiebreak)*

## 2b. Post — same-day tiebreak partner

**slug:** `hakol-mathil-bsicha`
**title:** הכל מתחיל בשיחה אחת
**category:** תהליך אישי
**excerpt:** לפעמים השינוי הכי גדול מתחיל מהמשפט הכי קטן שאומרים בקול רם.
**reading_time:** `5`
**status:** `published`
**published_at:** `2026-02-14T14:30:00Z` *(same calendar day, later timestamp — deterministic tiebreak by full timestamp, not just date)*

---

## 2c. Post — future-dated, published status, tests the date filter specifically

**slug:** `machshavot-al-hemshech`
**title:** מחשבות על המשך הדרך
**category:** קהילה
**excerpt:** רשומה שנקבעה לפרסום עתידי, ומיועדת לבדוק שרשומות עתידיות אינן מוצגות ברשימה הציבורית.
**reading_time:** `2`
**status:** `published` *(decided — not draft; must be excluded by the date check, not the status filter)*
**published_at:** `2027-01-01T09:00:00Z` *(future relative to current date — the date filter, `published_at <= now()`, is what must exclude this row)*

## 2d. Post — draft status, past date, tests the status filter and `includeDrafts`

**slug:** `tiuta-lo-gmura`
**title:** טיוטה שעדיין לא הושלמה
**category:** תהליך אישי
**excerpt:** רשומה בסטטוס טיוטה עם תאריך עבר — בודקת שסינון הסטטוס עובד באופן עצמאי מסינון התאריך, ושהאדמין עם `includeDrafts` כן רואה אותה.
**reading_time:** `3`
**status:** `draft` *(must be excluded from the public list regardless of `published_at`; visible only via the admin's `{ includeDrafts: true }` option)*
**published_at:** `2026-01-10T09:00:00Z` *(past date — isolates that exclusion here is due to `status`, not the date)*

**Public listing logic (also written into §5.5 of the spec):** `status = 'published' AND published_at <= now()`. These are two independent filters — `2c` exercises the date filter alone (published, future-dated), `2d` exercises the status filter alone (draft, past-dated).

---

## 2e. Category with exactly one post

**category:** קול הבוגרים *(seeded with only this one post — tests near-empty archive + pagination edge)*

**slug:** `sipur-echad-shel-shinuy`
**title:** סיפור אחד של שינוי
**excerpt:** רשומה יחידה בקטגוריה הזו, במכוון — בודקת את התצוגה כשיש רק פריט אחד.
**reading_time:** `6`
**status:** `published`
**published_at:** `2026-04-20T09:00:00Z`

*(Remaining posts to reach the ≥12-post / ≥3-category minimum follow the same shape, spread roughly monthly across ~2025-11 to ~2026-06, when the full fixture volume is written.)*

---

## 3. Training — 0 instructors (empty-relation extreme)

**slug:** `tekhilat-derech`
**title:** תחילת דרך — סדנת היכרות
**excerpt:** סדנה קצרה למי שרוצה להתחיל ולראות אם התהליך מתאים.
**academic_hours:** `8` *(integer)*
**sessions_count:** `2` *(integer)*
**instructors:** *(none — zero instructors, tests the m2m join returning an empty relation)*
**price:** `null`
**is_featured:** false
**cover_image:** *(placeholder — additional cover images sourced with the full volume)*

## 3b. Training — 1 instructor, has a real downloaded cover image

**slug:** `yesodot-hakesher`
**title:** יסודות הקשר — הכשרה שנתית לליווי זוגי ומשפחתי
**excerpt:** תוכנית שנתית להעמקת ההבנה של דפוסי קשר — האישיים, והמקצועיים.
**body (abridged):** תוכנית זו מיועדת למי שרוצה להעמיק את העבודה עם זוגות ומשפחות מתוך הבנה של דפוסי היקשרות, תקשורת, ותהליכי שינוי משותפים. הלמידה משלבת תיאוריה, תרגול בקבוצה קטנה, וליווי אישי.
**meeting_day / meeting_time:** ימי שלישי, 17:00–20:00 *(placeholder shape only — no historical claim)*
**academic_hours:** `96` *(integer)*
**sessions_count:** `24` *(integer)*
**instructors:** נועה שגיא (1 instructor)
**price:** `null`
**is_featured:** true
**cover_image:** `lib/mock/fixtures/images/training-yesodot-hakesher-cover.jpg` — downloaded from Unsplash, photographer Priscilla Du Preez, Unsplash License. Logged in `docs/licenses.md`.

## 3c. Training — 3 instructors, long title (65 chars, wraps in carousel card)

**slug:** `tochnit-rav-shnatit-lehachvanat-metaplim`
**title:** התוכנית הרב־שנתית להכשרת מלווים ומלוות בתהליכי שינוי אישי ומשפחתי *(65 chars)*
**excerpt:** תוכנית העומק המרכזית של אשד — לימוד מתמשך, ליווי אישי, ותרגול קבוצתי לאורך שלוש שנים.
**academic_hours:** `310` *(integer — long course, clearly distinct scale)*
**sessions_count:** `90` *(integer)*
**instructors:** נועה שגיא, דניאל אבירם, שירה נחמני (3 instructors — exercises the m2m join with multiple resolved rows)
**price:** `null`
**is_featured:** true

*(Remaining trainings to reach the ≥5 minimum vary session/hour counts further when the full volume is written. None reuse 30 sessions / 120 hours — the figures on the competitor site we agreed not to draw from.)*

---

## 4. Lecturer — extreme: short role (16 chars, target 12–18 ✓), visible + featured

**name:** נועה שגיא
**role:** מרצה בכירה, זוגי *(16 chars)*
**bio (abridged):** נועה מלווה קבוצות ויחידים בתחום הזוגיות והמשפחה שנים רבות, מתוך אמונה שכל קשר — גם כשהוא נשבר — נושא בתוכו דרך אפשרית לתיקון.
**is_visible:** `true` *(new column — the row's public display now gates on this, not on `is_featured`)*
**is_featured:** `true`
**consent_on_file:** `false` *(fictional; exempt from both `CHECK` constraints — `is_placeholder OR NOT is_visible OR consent_on_file` and `NOT is_featured OR is_visible` — only because `is_placeholder = true`)*
**photo:** generated abstract avatar (DiceBear), downloaded and committed to `/lib/mock/fixtures/images/`, sanitized on ingest — not fetched from the generator host at runtime, not a photograph

## 4b. Lecturer — extreme: long role (84 chars, target 70–90 ✓), visible but not featured

**name:** דניאל אבירם
**role:** מדריך תוכניות ליווי לאנשי מקצוע בתחומי הטראומה, ההתמכרויות, והעבודה המשפחתית המורכבת *(84 chars)*
**bio (abridged):** דניאל מגיע מרקע של עבודה קהילתית ומאמין בשילוב בין תיאוריה מוצקה לבין נוכחות אנושית פשוטה בחדר.
**is_visible:** `true` *(shown on `/about`, but not on the homepage grid)*
**is_featured:** `false`
**consent_on_file:** `false` *(fictional; exempt via `is_placeholder`)*
**photo:** generated abstract avatar (DiceBear), downloaded and committed, sanitized on ingest

## 4c. Lecturer — extreme: not visible at all (tests the gap the constraint was written to close)

**name:** שירה נחמני
**role:** מרצה, תוכנית רב־שנתית
**bio (abridged):** שירה מתמחה בליווי קבוצתי ארוך טווח ובעבודה עם תהליכי שינוי מורכבים.
**is_visible:** `false` *(intentionally hidden — demonstrates that a non-featured, non-visible row correctly stays off `/about`, unlike the previous round where `is_visible` didn't exist and a non-featured row rendered publicly regardless)*
**is_featured:** `false`
**consent_on_file:** `false` *(fictional; exempt via `is_placeholder`, and moot here since the row isn't public anyway)*
**photo:** generated abstract avatar (DiceBear), downloaded and committed, sanitized on ingest

*(Additional lecturers to reach the ≥8 minimum, mid-length, when the full volume is written.)*

---

## 5. Testimonial — demonstrates the fixed consent/visibility interaction

**author_name:** מ. *(initial only — placeholder pattern; real testimonials follow this same consent-first shape)*
**quote:** הגעתי בלי לדעת בדיוק מה אני מחפש. מה שקיבלתי היה מקום שיכולתי להיות בו בדיוק כמו שאני, ומשם להתחיל לזוז.
**is_visible:** `true`
**consent_on_file:** `false` *(fictional; exempt from `CHECK (is_placeholder OR NOT is_visible OR consent_on_file)` only because `is_placeholder = true`)*
**photo:** generated abstract avatar (DiceBear), downloaded and committed, sanitized on ingest

**The interaction this row is meant to exercise, once de-placeholdered (per the new §8 Server Action rule):** an admin opens this record, replaces the quote with a real person's real words, and saves *without* checking `consent_on_file`. The save must succeed — `is_placeholder` flips to `false` as always — but the Server Action forces `is_visible = false` before the write, and the admin sees: *"ההמלצה נשמרה כמוסתרת. לא ניתן להציג המלצה של אדם אמיתי ללא אישור בכתב. סמנו את אישור ההסכמה כדי להציג אותה."* The `CHECK` constraint never fires in this path — it only exists as a backstop for a bug or direct DB access. A test asserting exactly this path (save succeeds, `is_visible` forced false, correct Hebrew message shown) is specified in §8.

---

## 6. Program structure — 5 stages, 2/4/3/2/3 steps (14 total)

Unchanged and approved. Deliberately non-uniform, deliberately not modeled on any real 12-step or other known methodology.

### שלב 1: הגעה (2 steps)
1. **לעצור** — לתת לעצמך רגע לבדוק איפה נמצאים, בלי לשפוט.
2. **לבקש עזרה** — הצעד שבדרך כלל הכי קשה, ומשם הכול נעשה קל יותר.

### שלב 2: הבנה (4 steps)
1. **לזהות דפוס** — לשים לב לצורה שבה חוזרים ומגיבים במצבים דומים.
2. **להבין מקור** — לחבר בין ההווה לניסיון שעיצב אותו.
3. **לתת שם לרגש** — למצוא מילים למה שקודם היה רק תחושה מעורפלת.
4. **לוותר על ההסבר הישן** — לבחור סיפור חדש על מה שקרה, בלי לזייף את מה שהיה.

### שלב 3: שינוי (3 steps)
1. **לנסות משהו אחר** — לבחור תגובה שונה במצב מוכר.
2. **לטעות ולנסות שוב** — התהליך לא לינארי, וזה בסדר.
3. **לבנות הרגל חדש** — לתת לבחירה החדשה להפוך לדרך פעולה קבועה.

### שלב 4: חיבור (2 steps)
1. **לשתף מישהו קרוב** — להביא את מה שנלמד אל תוך מערכת יחסים אמיתית.
2. **לקבל תמיכה הדדית** — ללמוד גם לתת וגם לקבל, לא רק אחד מהם.

### שלב 5: המשכיות (3 steps)
1. **לשמור על המרחב** — להמשיך לפנות זמן לעצמך גם כשהמשבר חלף.
2. **לחזור כשצריך** — לדעת שאפשר לשוב לכל שלב קודם בלי בושה.
3. **להעביר הלאה** — לשתף ממה שנלמד, אם ומתי שרוצים.

---

## Notes on fixes applied this round

1. **Name collision (info only, no action needed):** client independently found "מכללת אשד" sits two letters from "מכללת אשדוד," a real municipal training nonprofit. Logged in `docs/content-needed.md` as a residual risk to clear before the client's real brand replaces the placeholder — not grounds to re-pick, since this never ships as a real identity.
2. **P0-1 fixed:** added `lecturers.is_visible boolean not null default false` to §6. Constraint corrected to `CHECK (is_placeholder OR NOT is_visible OR consent_on_file)`, plus `CHECK (NOT is_featured OR is_visible)` so a lecturer can't be featured while hidden. Fixture 4c added specifically to demonstrate a non-featured, non-visible row now correctly stays non-public — the exact gap the previous constraint left open.
3. **P0-2 fixed:** §8 now specifies the Server Action must force `is_visible = false` on de-placeholder-save when consent is unchecked, show the Hebrew message, and never let the admin hit the raw `CHECK` constraint. The constraint is documented as a backstop. Testimonial fixture #5 spells out the exact test path.
4. **P1-3 fixed:** every length extreme above is annotated with a character count computed by a small Node script (measured, not eyeballed) — see the measurement approach used to verify postTitleLong=80, postTitleShort=17, excerptShort=65, excerptLong=189, roleShort=16, roleLong=84 against the §5.5 targets (title 15–20/65–80, excerpt 60–80/200–240, role 12–18/70–90). `excerptLong` at 189 is still short of the 200–240 target and will be extended when the full volume is written.
5. **P1-4 fixed:** one real cover image downloaded (not hotlinked) to `lib/mock/fixtures/images/training-yesodot-hakesher-cover.jpg`, sourced from Unsplash (Priscilla Du Preez, Unsplash License), logged in `docs/licenses.md`. The DiceBear-avatar exception is now spelled out as downloaded-and-committed-and-sanitized, not a runtime fetch — closing the same loophole the stock-image rule was written to prevent.
6. **P2-5 fixed:** the future-dated post (`machshavot-al-hemshech`) is now `status = 'published'` with `published_at = 2027-01-01`, isolating the date filter. A separate new fixture (`tiuta-lo-gmura`) is `status = 'draft'` with a past date, isolating the status filter. Public listing logic — `status = 'published' AND published_at <= now()` — is written into §5.5 as requested.
