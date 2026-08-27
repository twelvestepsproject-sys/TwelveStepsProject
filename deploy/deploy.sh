#!/usr/bin/env bash
# Build and start (or update) the stack.
#
#   bash deploy/deploy.sh
#
# Run it for the first deploy and for every update afterwards — it builds
# the new image, applies any new migrations, and restarts. Existing data
# and uploads are untouched.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"

if [ ! -f .env ]; then
  echo "No .env. Run: cp .env.production.example .env && nano .env"
  exit 1
fi

if grep -q "DOMAIN_PLACEHOLDER" nginx/conf.d/site.conf; then
  echo "nginx/conf.d/site.conf still has DOMAIN_PLACEHOLDER."
  echo "Run deploy/setup.sh first."
  exit 1
fi

echo
echo "=== 1/5  back up the database ==="
# Before, not after: if a migration goes wrong this is what you restore.
if $COMPOSE ps postgres 2>/dev/null | grep -q "Up\|running"; then
  bash deploy/backup.sh || echo "  (backup skipped — first deploy?)"
else
  echo "  database not running yet, nothing to back up"
fi

echo "=== 2/5  build ==="
$COMPOSE build --pull

echo "=== 3/5  start ==="
$COMPOSE up -d

echo "=== 4/5  wait for the database ==="
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -q 2>/dev/null; then
    echo "  ready"
    break
  fi
  [ "$i" -eq 30 ] && { echo "  database did not come up"; $COMPOSE logs --tail 30 postgres; exit 1; }
  sleep 2
done

echo "=== 5/5  apply migrations ==="
# Idempotent: already-applied files are skipped (schema_migrations).
$COMPOSE exec -T app node scripts/pg-migrate.mjs

echo
echo "=== status ==="
$COMPOSE ps

SITE_URL="$(grep -E '^NEXT_PUBLIC_SITE_URL=' .env | cut -d= -f2-)"
echo
echo "Deployed: $SITE_URL"
echo
echo "If this was the first deploy, import content and set a password:"
echo "    $COMPOSE exec app node scripts/pg-import-content.mjs"
echo "    $COMPOSE exec app node scripts/pg-set-password.mjs you@example.com"
echo
