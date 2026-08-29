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

# This script builds from the working tree, never from the remote — it does
# not pull. Forgetting `git pull` first therefore rebuilds the SAME code and
# reports success, which has now happened twice: a deploy looked clean while
# the fix was still sitting on the remote. Checked here rather than after
# the build, so it costs seconds instead of a full rebuild.
#
# Only a warning when the remote cannot be reached (offline, no credentials)
# — that must not block a deploy that is otherwise fine.
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [ -n "$BRANCH" ] && git fetch --quiet origin "$BRANCH" 2>/dev/null; then
  LOCAL="$(git rev-parse HEAD 2>/dev/null || echo "")"
  REMOTE="$(git rev-parse "origin/$BRANCH" 2>/dev/null || echo "")"
  if [ -n "$LOCAL" ] && [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ] &&
     git merge-base --is-ancestor "$LOCAL" "$REMOTE" 2>/dev/null; then
    echo "This checkout is behind origin/$BRANCH — the build would not include"
    echo "the newer commits:"
    echo
    git --no-pager log --oneline "$LOCAL..$REMOTE" | sed 's/^/    /'
    echo
    echo "Run:  git pull && bash $0 ${1:-}"
    exit 1
  fi
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
# --force-recreate on app is required, not defensive: compose compares the
# service definition, not the image contents, so after a rebuild it decides
# nothing changed and leaves the OLD container running. A deploy then
# reported success while still serving the previous build.
if [ "$NO_DOMAIN" -eq 1 ]; then
  # Only these two: `up -d` with no arguments would also try to start nginx.
  $COMPOSE up -d postgres
  $COMPOSE up -d --force-recreate app
else
  $COMPOSE up -d
  $COMPOSE up -d --force-recreate app
fi

echo "=== 6/6  apply migrations (post-build) ==="
# Re-run against the freshly built image: a deploy that adds a migration
# needs it applied, and this is idempotent (schema_migrations).
for i in $(seq 1 30); do
  $COMPOSE exec -T postgres pg_isready -q 2>/dev/null && break
  sleep 2
done
$COMPOSE exec -T app node scripts/pg-migrate.mjs

# A deploy that silently kept the old container is the failure this script
# already shipped once, so it is now checked rather than assumed: the
# running container must be newer than the commit being deployed.
echo
echo "=== verifying the running container is the one just built ==="
IMAGE_CREATED="$($COMPOSE ps -q app 2>/dev/null | head -1 | xargs -r docker inspect --format '{{.Created}}' 2>/dev/null || echo "")"
if [ -n "$IMAGE_CREATED" ]; then
  echo "  container started: $IMAGE_CREATED"
  COMMIT_EPOCH="$(git log -1 --format=%ct 2>/dev/null || echo 0)"
  CONTAINER_EPOCH="$(date -d "$IMAGE_CREATED" +%s 2>/dev/null || echo 0)"
  if [ "$COMMIT_EPOCH" -gt 0 ] && [ "$CONTAINER_EPOCH" -gt 0 ] && [ "$CONTAINER_EPOCH" -lt "$COMMIT_EPOCH" ]; then
    echo
    echo "  WARNING: the running container predates the current commit."
    echo "  The old build is still being served. Force a clean rebuild:"
    echo "     docker compose -f docker-compose.prod.yml -f docker-compose.build.yml build --no-cache app"
    echo "     docker compose -f docker-compose.prod.yml up -d --force-recreate app"
  else
    echo "  ok — newer than the current commit"
  fi
fi

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
