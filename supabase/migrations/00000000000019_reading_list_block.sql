-- Adds the `reading_list` block type (§5 block 24).
--
-- Core books / sources for a course page: an unbounded list where each
-- item carries a title, an optional cover image, a short description, and
-- an optional link. Mainly for the year-by-year psychotherapy pages.
--
-- Distinct from `latest_articles` (which pulls `posts` rows from the CMS):
-- these are external works — books, papers — that are not site content and
-- have no `posts` row to reference.
--
-- Values live in `page_blocks.data`, validated by
-- `readingListBlockDataSchema` in lib/schemas/blocks.ts on write, so the
-- jsonb column needs no change — only the enum gains a member.

alter type public.block_type add value if not exists 'reading_list';
