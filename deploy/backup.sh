#!/usr/bin/env bash
# Backs up the database and uploaded files.
#
#   bash deploy/backup.sh
#
# Leaving Supabase means losing its automatic backups — this replaces
# them. Run it from cron (see deploy/README or the guide).
#
# The database dump is small (~11MB uncompressed, far less gzipped), so
# keeping a month of daily backups costs very little disk.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"
STAMP="$(date +%Y-%m-%d_%H%M)"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

mkdir -p backups

set -a; . ./.env; set +a

echo "  dumping database..."
# --no-owner --no-acl keep the dump portable: without them it references
# the role that happened to own each object, and restoring into a database
# whose user is named differently fails with 'role "postgres" does not
# exist'. Ownership is reassigned to whoever runs the restore, which is
# what you want when moving between machines.
$COMPOSE exec -T postgres pg_dump \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-acl \
  | gzip > "backups/db-${STAMP}.sql.gz"

DB_SIZE="$(du -h "backups/db-${STAMP}.sql.gz" | cut -f1)"
echo "  backups/db-${STAMP}.sql.gz  ($DB_SIZE)"

STORAGE_HOST="${STORAGE_DIR_HOST:-/var/lib/twelvesteps/media}"
if [ -d "$STORAGE_HOST" ] && [ -n "$(ls -A "$STORAGE_HOST" 2>/dev/null)" ]; then
  echo "  archiving uploads..."
  tar czf "backups/media-${STAMP}.tar.gz" -C "$STORAGE_HOST" .
  MEDIA_SIZE="$(du -h "backups/media-${STAMP}.tar.gz" | cut -f1)"
  echo "  backups/media-${STAMP}.tar.gz  ($MEDIA_SIZE)"
else
  echo "  no uploads yet, skipping media archive"
fi

echo "  pruning backups older than ${KEEP_DAYS} days..."
find backups -name "db-*.sql.gz"     -mtime +"$KEEP_DAYS" -delete
find backups -name "media-*.tar.gz"  -mtime +"$KEEP_DAYS" -delete

echo
echo "  WARNING: these files are on the same server as the data."
echo "  A disk failure loses both. Copy them somewhere else — see the guide."
