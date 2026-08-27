#!/usr/bin/env bash
# Restores a backup produced by deploy/backup.sh.
#
#   bash deploy/restore.sh backups/db-2026-08-27_0300.sql.gz
#   bash deploy/restore.sh backups/db-....sql.gz backups/media-....tar.gz
#
# Destructive: the current database is replaced. Confirmation is required
# because this is the one script here that can lose data.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"
DB_FILE="${1:-}"
MEDIA_FILE="${2:-}"

if [ -z "$DB_FILE" ]; then
  echo "Usage: bash deploy/restore.sh <db-backup.sql.gz> [media-backup.tar.gz]"
  echo
  echo "Available:"
  ls -1t backups/*.gz 2>/dev/null | head -20 || echo "  (none)"
  exit 1
fi

[ -f "$DB_FILE" ] || { echo "Not found: $DB_FILE"; exit 1; }

set -a; . ./.env; set +a

echo
echo "About to REPLACE the current database with:"
echo "    $DB_FILE"
[ -n "$MEDIA_FILE" ] && echo "and overwrite uploads from:"
[ -n "$MEDIA_FILE" ] && echo "    $MEDIA_FILE"
echo
read -r -p "Type 'yes' to continue: " CONFIRM
[ "$CONFIRM" = "yes" ] || { echo "Cancelled."; exit 1; }

# Safety net: back up what is about to be overwritten.
echo
echo "=== backing up current state first ==="
bash deploy/backup.sh || echo "  (could not back up — continuing anyway)"

echo "=== stopping the app ==="
# Stops writes arriving mid-restore. The database stays up to receive it.
$COMPOSE stop app

echo "=== restoring database ==="
# The dump was taken with --clean --if-exists, so it drops and recreates.
gunzip -c "$DB_FILE" | $COMPOSE exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q

if [ -n "$MEDIA_FILE" ]; then
  [ -f "$MEDIA_FILE" ] || { echo "Not found: $MEDIA_FILE"; exit 1; }
  echo "=== restoring uploads ==="
  STORAGE_HOST="${STORAGE_DIR_HOST:-/var/lib/twelvesteps/media}"
  mkdir -p "$STORAGE_HOST"
  tar xzf "$MEDIA_FILE" -C "$STORAGE_HOST"
  chown -R 1001:1001 "$STORAGE_HOST" 2>/dev/null || true
fi

echo "=== starting the app ==="
$COMPOSE start app

echo
echo "Restored. Check the site loads before assuming it worked."
