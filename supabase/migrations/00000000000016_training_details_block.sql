-- Adds the `training_details` block type (§5 block 21).
--
-- Motivation: the "training details" panel (start date, meeting day/time,
-- price, …) existed ONLY on `/hachsharot/[slug]`, where it reads columns
-- off the `trainings` row backing that route. Editors asked for the same
-- panel on ordinary content pages (the year-by-year psychotherapy pages),
-- which are `pages` + `page_blocks` rows with no training behind them —
-- so there was nothing for a renderer to read. This makes it a real block
-- type whose values live in `page_blocks.data`, addable to any page.
--
-- Every field is optional (§ client request: "רצוי שכל השדות יהיו
-- אופציונליים") and validated by `trainingDetailsBlockDataSchema` in
-- lib/schemas/blocks.ts on write — the jsonb `data` column itself needs no
-- change, only the enum gains a member.

alter type public.block_type add value if not exists 'training_details';
