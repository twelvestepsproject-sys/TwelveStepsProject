#!/usr/bin/env bash
# Backs up the database and uploaded files.
#
#   bash deploy/backup.sh
#
# Leaving Supabase means losing its automatic backups — this replaces
# them. Run it from cron (see deploy/README or the guide).
#
# Keeps the newest 2 of each kind (BACKUP_KEEP to change). The media
# archive is the reason the count is small: the database dump is a few MB,
# but the uploads archive is ~37MB and grows with every photo added.
#
# Worth being clear about what 2 buys you: enough to roll back a bad deploy
# or a mistaken edit caught quickly, and not much more. It is not an
# archive — a problem noticed a week later is already past the window. That
# is what copying backups off the server is for.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

COMPOSE="docker compose -f docker-compose.prod.yml"
STAMP="$(date +%Y-%m-%d_%H%M)"
# Keep a fixed NUMBER of backups rather than everything from the last N
# days. Age-based pruning is unpredictable in both directions: a quiet week
# leaves nothing at all, while several runs in one day pile up. A count is
# what actually bounds the disk, which matters here because the archives sit
# on the same small VPS as the data.
KEEP="${BACKUP_KEEP:-2}"

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

# Prune to the newest $KEEP of each kind. Sorted by filename, not mtime:
# the names carry a sortable YYYY-MM-DD_HHMM stamp, so this stays correct
# even if a file is touched or copied around, which mtime would not.
prune() {
  local pattern="$1" kept=0 removed=0
  local files
  files="$(find backups -maxdepth 1 -name "$pattern" -type f | sort)"
  [ -z "$files" ] && return 0
  local total
  total="$(printf '%s
' "$files" | wc -l)"
  if [ "$total" -le "$KEEP" ]; then
    echo "    $pattern: $total kept, nothing to prune"
    return 0
  fi
  removed=$((total - KEEP))
  printf '%s
' "$files" | head -n "$removed" | while read -r f; do
    rm -f "$f"
  done
  kept=$KEEP
  echo "    $pattern: $kept kept, $removed removed"
}

echo "  keeping the newest ${KEEP} of each backup type..."
prune "db-*.sql.gz"
prune "media-*.tar.gz"

echo
echo "  WARNING: these files are on the same server as the data."
echo "  A disk failure loses both. Copy them somewhere else — see the guide."
