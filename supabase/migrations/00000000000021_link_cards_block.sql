-- Adds the `link_cards` block type (§5 block 30).
--
-- A row of cards, each with a title, text, optional image and a button —
-- built for the trainings page to link out to the year pages (שנה א׳/ב׳/ג׳),
-- and reusable anywhere a page needs to point at a few destinations.
--
-- No existing block fits: `focus_areas` cards have no image and no link,
-- `reading_list` is a vertical list of sources rather than a row of
-- navigational cards, and `trainings_carousel` pulls `trainings` rows
-- automatically and cannot point at ordinary pages.
--
-- Values live in `page_blocks.data`, validated by `linkCardsBlockDataSchema`
-- in lib/schemas/blocks.ts on write, so the jsonb column needs no change —
-- only the enum gains a member.

alter type public.block_type add value if not exists 'link_cards';
