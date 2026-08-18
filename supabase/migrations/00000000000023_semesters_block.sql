-- Adds the `semesters` block type (§5 block 33).
--
-- Collapsible semesters, each holding an unbounded list of sessions, each
-- of which holds an unbounded list of titled text parts (שיעור א׳ /
-- שיעור ב׳ / קבוצת עבודה …). Visually this follows the program-stages
-- stepper; structurally it is per-page content rather than the site-wide
-- `program_stages`/`program_steps` tables, so a training or year page can
-- carry its own schedule.
--
-- Not reusing `program_stages`: those are a single global sequence shared
-- by every page that renders the stepper, with a fixed two-level shape and
-- their own admin screen. A semester schedule belongs to one page, needs a
-- third level (session → parts), and must be editable inline with the rest
-- of that page's blocks.
--
-- Values live in `page_blocks.data`, validated by `semestersBlockDataSchema`
-- in lib/schemas/blocks.ts on write — the jsonb column needs no change,
-- only the enum gains a member.

alter type public.block_type add value if not exists 'semesters';
