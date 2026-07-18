# Project: Triotherapy site rebuild

The full build spec is at `docs/BUILD_SPEC.md`. Read it before any work.

## Ground rules
- Work in phases (spec §16). Stop for approval at the end of each phase.
- Never weaken RLS. Never use the service-role key client-side.
- Never fabricate content — log gaps in docs/manual-migration.md.
- Ask when ambiguous. Don't guess.

## Commands
- pnpm dev / pnpm build / pnpm typecheck / pnpm test