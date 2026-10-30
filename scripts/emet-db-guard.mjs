/**
 * Refuses to run against any database but EMETMATRIX's.
 *
 * These scripts write content tables, and three Postgres instances sit a
 * digit apart on this machine: הנני on 5432, tamar on 5433, emet on 5435.
 * Pointing an import at the wrong one would overwrite another site's
 * content, so every write script calls this before opening a connection.
 *
 * The check is on the database NAME rather than the port, because the port
 * is not stable across environments: in production the app reaches Postgres
 * over the compose network as `postgres:5432`, and the deploy scripts reach
 * it through a localhost proxy on an arbitrary high port. A port guard that
 * demanded 5435 passed locally and refused everywhere else — which is how
 * the production database ended up migrated but never seeded.
 *
 * The name is the thing that actually identifies the target, so it is what
 * gets checked. Ports are still used, in the other direction: הנני's and
 * tamar's are rejected outright even if a URL claims the `emet` name, so a
 * mistyped port cannot reach them.
 */

/** Ports the other sites publish on THIS host. Never written to.
 *
 *  Only meaningful for a loopback host: inside the compose network the
 *  name `postgres` resolves to emet's own container, which listens on
 *  5432 like every default Postgres, and is not הנני. */
const FOREIGN_LOCAL_PORTS = new Set(["5432", "5433"]);
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"]);

/** The expected database name, overridable for a staging copy. */
const EXPECTED_DB = process.env.EMET_DB_NAME ?? "emet";

/**
 * Exits the process unless `DATABASE_URL` points at the emet database.
 * Returns the parsed URL so callers can reuse it.
 */
export function assertEmetDatabase(rawUrl = process.env.DATABASE_URL ?? "") {
  const refuse = (why) => {
    // The URL carries a password, so it is never echoed back in full.
    console.error(`refusing to run: ${why}`);
    process.exit(1);
  };

  if (!rawUrl) refuse("DATABASE_URL is not set.");

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    refuse("DATABASE_URL is not a valid URL.");
  }

  const name = parsed.pathname.replace(/^\//, "");
  if (name !== EXPECTED_DB) {
    refuse(
      `DATABASE_URL names database "${name}", expected "${EXPECTED_DB}". ` +
        `Set EMET_DB_NAME if this is intentional.`,
    );
  }

  // A correct name on one of the other sites' published ports means the
  // URL is malformed rather than deliberate: stop instead of guessing.
  // Scoped to loopback, where those ports are actually theirs.
  if (LOCAL_HOSTS.has(parsed.hostname) && FOREIGN_LOCAL_PORTS.has(parsed.port)) {
    refuse(
      `DATABASE_URL names "${name}" but points at port ${parsed.port}, ` +
        `which another site publishes on this host.`,
    );
  }

  return parsed;
}
