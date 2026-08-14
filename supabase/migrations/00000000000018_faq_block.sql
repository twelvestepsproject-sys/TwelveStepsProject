-- Adds the `faq` block type (§5 block 23).
--
-- Heading + optional intro + an unbounded list of question/answer pairs,
-- rendered as an accordion. §9 already anticipated this ("FAQPage JSON-LD
-- where FAQs exist") but no FAQ data model existed anywhere in the schema,
-- so the structured data had nothing to read from.
--
-- Values live in `page_blocks.data`, validated by `faqBlockDataSchema` in
-- lib/schemas/blocks.ts on write — the jsonb column needs no change, only
-- the enum gains a member.

alter type public.block_type add value if not exists 'faq';
