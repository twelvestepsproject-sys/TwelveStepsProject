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
if [ "$NO_DOMAIN" -eq 1 ]; then
  # Only these two: `up -d` with no arguments would also try to start nginx.
  $COMPOSE up -d postgres app
else
  $COMPOSE up -d
fi

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
