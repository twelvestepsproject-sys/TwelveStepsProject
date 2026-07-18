// §5.5 launch gate: queries for any row with is_placeholder = true and
// fails if DATA_SOURCE=supabase. This is a stub until Phase 5 wires up
// supabaseDataSource — against the mock (Phase 1-4) placeholder content is
// expected and this script is a deliberate no-op so it doesn't block local
// dev. Real enforcement (querying every content table via the Supabase
// admin client) is implemented in Phase 5 alongside supabaseDataSource.

const dataSource = process.env.DATA_SOURCE ?? "mock";

if (dataSource !== "supabase") {
  console.log(
    `[check:placeholder] DATA_SOURCE=${dataSource} — placeholder content is expected pre-Phase-5. Skipping.`,
  );
  process.exit(0);
}

console.error(
  "[check:placeholder] DATA_SOURCE=supabase but the real placeholder query isn't implemented yet (Phase 5). Failing closed.",
);
process.exit(1);
