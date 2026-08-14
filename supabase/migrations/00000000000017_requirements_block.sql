-- Adds the `requirements` block type (§5 block 22).
--
-- A heading + intro + freely add/remove/reorder list of prerequisites, for
-- the psychotherapy and 12-steps training pages (and the year pages where
-- relevant). No existing block fits: `focus_areas` is capped at 3-4 cards
-- and demands an icon+title+body per item, and `about` carries a single
-- prose body with no list at all.
--
-- Values live in `page_blocks.data` and are validated by
-- `requirementsBlockDataSchema` in lib/schemas/blocks.ts on write, so the
-- jsonb column needs no change — only the enum gains a member.

alter type public.block_type add value if not exists 'requirements';
