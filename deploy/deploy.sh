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

# --no-domain runs app + database only, publishing the app on port 80
# directly. nginx is skipped because it cannot start without a certificate,
# and there is no domain to get one for yet.
NO_DOMAIN=0
if [ "${1:-}" = "--no-domain" ]; then
  NO_DOMAIN=1
  COMPOSE="$COMPOSE -f docker-compose.no-domain.yml"
fi

if [ ! -f .env ]; then
  echo "No .env. Run: cp .env.production.example .env && nano .env"
  exit 1
fi

if [ "$NO_DOMAIN" -eq 0 ] && grep -q "DOMAIN_PLACEHOLDER" nginx/conf.d/site.conf; then
  echo "nginx/conf.d/site.conf still has DOMAIN_PLACEHOLDER."
  echo "Either run deploy/setup.sh <domain> <email> first,"
  echo "or start without a domain:  bash deploy/deploy.sh --no-domain"
  exit 1
fi

echo
echo "=== 1/6  back up the database ==="
# Before, not after: if a migration goes wrong this is what you restore.
if $COMPOSE ps postgres 2>/dev/null | grep -q "Up\|running"; then
  bash deploy/backup.sh || echo "  (backup skipped — first deploy?)"
else
  echo "  database not running yet, nothing to back up"
fi

echo "=== 2/6  start the database ==="
# Up front, because the build prerenders public pages against real content
# (see the Dockerfile's builder stage) and therefore needs both a reachable
# database and an applied schema before it runs.
#
# BUILD_COMPOSE adds a 127.0.0.1-only published port so the build can reach
# postgres over host networking; it is dropped again after the build, so
# the port is open only while building and never from outside the machine.
BUILD_COMPOSE="$COMPOSE -f docker-compose.build.yml"
$BUILD_COMPOSE up -d postgres
for i in $(seq 1 30); do
  $COMPOSE exec -T postgres pg_isready -q 2>/dev/null && break
  [ "$i" -eq 30 ] && { echo "  database did not come up"; $COMPOSE logs --tail 30 postgres; exit 1; }
  sleep 2
done
echo "  ready"

echo "=== 3/6  apply migrations ==="
# node lives in the app image, which does not exist yet on a first deploy.
# A throwaway node container mounting the repo covers that case; once an
# app image exists the normal path is used.
set -a; . ./.env; set +a
if docker image inspect "$(basename "$PWD")-app" >/dev/null 2>&1; then
  $BUILD_COMPOSE run --rm --no-deps -T app node scripts/pg-migrate.mjs
else
  # No app image exists on a first deploy, and node lives only in that
  # image — so a throwaway node container mounting the repo runs them.
  echo "  no app image yet — running migrations in a temporary container"
  docker run --rm --network host     -v "$PWD:/work" -w /work     -e DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${BUILD_DB_PORT:-55432}/${POSTGRES_DB}"     node:22-alpine sh -c "npm install --no-audit --no-fund --silent pg@8 >/dev/null 2>&1 && node scripts/pg-migrate.mjs"
fi

echo "=== 4/6  build ==="
$BUILD_COMPOSE build --pull

# Drop the temporary port: recreating postgres without the build overlay
# removes the published port, so it goes back to being unreachable from
# the host for normal operation.
echo "  closing the temporary database port"
$COMPOSE up -d --force-recreate postgres

echo "=== 5/6  start ==="
if [ "$NO_DOMAIN" -eq 1 ]; then
  # Only these two: `up -d` with no arguments would also try to start nginx.
  $COMPOSE up -d postgres app
else
  $COMPOSE up -d
fi

echo "=== 6/6  apply migrations (post-build) ==="
# Re-run against the freshly built image: a deploy that adds a migration
# needs it applied, and this is idempotent (schema_migrations).
for i in $(seq 1 30); do
  $COMPOSE exec -T postgres pg_isready -q 2>/dev/null && break
  sleep 2
done
$COMPOSE exec -T app node scripts/pg-migrate.mjs

echo
echo "=== status ==="
$COMPOSE ps

if [ "$NO_DOMAIN" -eq 1 ]; then
  IP="$(curl -s --max-time 5 ifconfig.me || echo YOUR_SERVER_IP)"
  echo
  echo "Deployed (HTTP only): http://$IP"
  echo "Add a domain later with: sudo bash deploy/setup.sh yourdomain.com you@example.com"
else
  SITE_URL="$(grep -E '^NEXT_PUBLIC_SITE_URL=' .env | cut -d= -f2-)"
  echo
  echo "Deployed: $SITE_URL"
fi
echo
echo "If this was the first deploy, import content and set a password:"
echo "    $COMPOSE exec app node scripts/pg-import-content.mjs"
echo "    $COMPOSE exec app node scripts/pg-set-password.mjs you@example.com"
echo
