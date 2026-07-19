-- Phase 5 fix-up — page_blocks.sort_order needs to accept fractional
-- values. lib/mock/fixtures/pages.ts uses values like 2.1/2.2/7.1/7.2/7.3
-- to insert a block "between" two integer-ordered siblings without
-- renumbering every row after it — a legitimate, already-shipped pattern
-- in the Phase 3/4 mock data. The original migration declared this column
-- `integer`, which rejects those values outright (discovered while running
-- supabase/seed/seed.mjs against this migration).
--
-- FLAGGED DRIFT (not silently reconciled): lib/schemas/blocks.ts's
-- `pageBlockSchema` types `sort_order` as `z.number().int()`, which the
-- fixture data technically violates (2.1 fails that validator). The mock
-- DataSource's `getPage`/`listPages` return raw fixture objects without
-- re-validating each block against the discriminated union, so this drift
-- was never caught by `pnpm typecheck` or a mock-mode run — only the DB
-- migration surfaced it. This migration makes the DB accept what the
-- fixtures actually contain (numeric, not integer) rather than rejecting
-- real Phase 3/4 content; whether `lib/schemas/blocks.ts` should be
-- loosened to match is a /lib/schemas change outside Phase 5's scope
-- (touching zod schemas isn't part of "Supabase & swap") and is called
-- out here for a decision rather than changed unilaterally.
alter table public.page_blocks
  alter column sort_order type numeric using sort_order::numeric,
  alter column sort_order set default 0;
