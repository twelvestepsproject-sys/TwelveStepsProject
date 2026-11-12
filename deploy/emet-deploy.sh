#!/usr/bin/env bash
#
# Deploys the EMETMATRIX fixes: cache revalidation, https media URLs, and
# optionally the root-URL preview.
#
# Written to be run on the server from the emet stack directory. It assumes
# nothing about paths or service names that it has not read first — every
# guess made by hand this evening was wrong at least once, including
# /opt/emet (does not exist), the certbot service name (prod-only, and its
# entrypoint is overridden), and which compose file /opt/emetmatrix uses
# (the default one names the OTHER site's containers and adopting it moved
# the live database onto another project's network).
#
# So: the compose file is required as an argument or discovered, the
# database is reached through the running container rather than a published
# port, and the live site is checked before and after.
#
#   bash deploy/emet-deploy.sh                 # dry run, changes nothing
#   bash deploy/emet-deploy.sh --apply         # deploy
#   bash deploy/emet-deploy.sh --apply --root  # also switch to root URLs
#
# Rollback: deploy/emet-deploy-rollback.sh

set -Eeuo pipefail

APPLY=0
ROOT_URLS=0
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1 ;;
    --root)  ROOT_URLS=1 ;;
    *) echo "unknown option: $a" >&2; exit 1 ;;
  esac
done

EMET_DIR=${EMET_DIR:-/opt/emetmatrix}
MAIN_DIR=${MAIN_DIR:-/opt/twelvesteps}
EMET_CT=${EMET_CT:-emet-app}
EMET_DB_CT=${EMET_DB_CT:-emet-postgres}
NGINX_CT=${NGINX_CT:-twelvesteps-nginx}
MAIN_DOMAIN=${MAIN_DOMAIN:-hineni.io}
EMET_DOMAIN=${EMET_DOMAIN:-new.hineni.io}
BRANCH=${BRANCH:-emetmatrix-site}
# Normally discovered from the container in preflight; overridable for a
# stack whose credentials are not in its container environment.
DB_USER=${DB_USER:-}
DB_NAME=${DB_NAME:-}
DB_PASS=${DB_PASS:-}

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
warn() { printf '    \033[33mWARN\033[0m %s\n' "$*"; }
step() { printf '    \033[90m--\033[0m   %s\n' "$*"; }
die()  { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

if [ "$APPLY" = "0" ]; then
  printf '\n\033[1;33mDRY RUN\033[0m - nothing will be changed. Re-run with --apply.\n'
fi

run() {
  if [ "$APPLY" = "1" ]; then "$@"; else step "would run: $*"; fi
}

# --------------------------------------------------------------------------
# 0. Preflight
# --------------------------------------------------------------------------
say "0/6  Preflight"

[ -d "$EMET_DIR" ] || die "$EMET_DIR does not exist. Find the stack with: ls -d /opt/*/"
ok "emet stack dir: $EMET_DIR"

for ct in "$EMET_CT" "$EMET_DB_CT" "$NGINX_CT"; do
  docker inspect -f '{{.State.Running}}' "$ct" 2>/dev/null | grep -q true \
    || die "$ct is not running."
done
ok "containers up: $EMET_CT, $EMET_DB_CT, $NGINX_CT"

# The compose file is NOT in the repo - it was written on the server - so
# it is discovered and verified, never assumed. The default
# docker-compose.yml in this directory names the OTHER site's containers;
# using it adopted the live database into this project and broke it.
COMPOSE_FILE=${COMPOSE_FILE:-}
if [ -z "$COMPOSE_FILE" ]; then
  COMPOSE_FILE=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$EMET_CT" 2>/dev/null | tr ',' '\n' | head -1)
fi
[ -n "$COMPOSE_FILE" ] && [ -f "$COMPOSE_FILE" ] \
  || die "could not determine the compose file $EMET_CT was started from.
      Find it with:
        docker inspect $EMET_CT --format '{{index .Config.Labels \"com.docker.compose.project.config_files\"}}'
      then re-run with COMPOSE_FILE=<that file>"
ok "compose file: $COMPOSE_FILE"

# Refuse a compose file that would touch the other site's containers.
if grep -qE 'container_name:\s*twelvesteps-' "$COMPOSE_FILE"; then
  die "$COMPOSE_FILE names twelvesteps-* containers. Running compose with it
      would adopt the live site's containers into this project. Refusing."
fi
ok "compose file names no twelvesteps-* containers"

# A compose file without `name:` takes its project name from the directory,
# so two stacks in one directory become the same project and bringing one
# up removes the other's containers.
grep -qE '^name:' "$COMPOSE_FILE" \
  || warn "$COMPOSE_FILE has no 'name:' - its project name comes from the
         directory, which is how a stack here clobbered another one before.
         Proceeding, but check it before adding a second stack."

# The database user, name and password come from the container's own
# environment rather than being assumed. postgres/postgres/emet was
# hardcoded here and the backup failed on the server with `role "postgres"
# does not exist`: that stack was brought up with its own
# EMET_POSTGRES_USER. The container knows what it was started with; this
# script does not get to guess.
if [ -z "$DB_USER" ]; then
  DB_USER=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_USER"' 2>/dev/null || true)
fi
if [ -z "$DB_NAME" ]; then
  DB_NAME=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_DB"' 2>/dev/null || true)
fi
if [ -z "$DB_PASS" ]; then
  DB_PASS=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_PASSWORD"' 2>/dev/null || true)
fi

[ -n "$DB_USER" ] || die "could not read POSTGRES_USER from $EMET_DB_CT.
      Look at what it was started with:
        docker exec $EMET_DB_CT env | grep POSTGRES_
      then re-run with DB_USER=... DB_NAME=... DB_PASS=..."
[ -n "$DB_NAME" ] || die "could not read POSTGRES_DB from $EMET_DB_CT (see above)."

# Prove the credentials work before anything is written, so a wrong user
# surfaces here instead of halfway through the deploy.
docker exec -e PGPASSWORD="$DB_PASS" "$EMET_DB_CT" \
  psql -U "$DB_USER" -d "$DB_NAME" -c 'select 1' >/dev/null 2>&1 \
  || die "cannot connect to database $DB_NAME as $DB_USER inside $EMET_DB_CT.
      Try it by hand:
        docker exec -it $EMET_DB_CT psql -U $DB_USER -d $DB_NAME -c 'select 1'"
ok "database: $DB_NAME as $DB_USER (connection verified)"

ENV_FILE="$EMET_DIR/.env"
[ -f "$ENV_FILE" ] || die "$ENV_FILE not found."
ok "env file: $ENV_FILE"

BASELINE=$(curl -sk -o /dev/null -w '%{http_code}' "https://$MAIN_DOMAIN/" || echo 000)
[ "$BASELINE" = "200" ] || die "$MAIN_DOMAIN is returning $BASELINE before any change.
      Fix the live site first; do not deploy on top of an outage."
ok "$MAIN_DOMAIN serving 200 before we start"

COMPOSE="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

# --------------------------------------------------------------------------
# 1. Back up the emet database
# --------------------------------------------------------------------------
say "1/6  Backing up the emet database"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$EMET_DIR/backups"
DUMP="$BACKUP_DIR/emet-$STAMP.sql.gz"

# Through the container, not a published port: the prod stack need not
# publish one, and this works either way.
if [ "$APPLY" = "1" ]; then
  mkdir -p "$BACKUP_DIR"
  docker exec -e PGPASSWORD="$DB_PASS" "$EMET_DB_CT" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$DUMP" \
    || die "database backup failed. Nothing has been changed."
  SIZE=$(du -h "$DUMP" | cut -f1)
  printf '%s\n' "$DUMP" > "$EMET_DIR/.emet-deploy-last-dump"
  ok "saved $DUMP ($SIZE)"
else
  step "would dump emet to $DUMP"
fi

# --------------------------------------------------------------------------
# 2. Fetch the code
# --------------------------------------------------------------------------
say "2/6  Fetching $BRANCH"
cd "$EMET_DIR"
BEFORE=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
step "currently at $BEFORE"

# Named explicitly rather than a bare `git pull`: this directory has been
# on more than one branch, and pulling the wrong one here deploys the wrong
# site's code.
run git fetch origin "$BRANCH"
if [ "$APPLY" = "1" ]; then
  git -c advice.detachedHead=false checkout "$BRANCH" >/dev/null 2>&1 || die "could not check out $BRANCH"
  git merge --ff-only "origin/$BRANCH" >/dev/null 2>&1 || die "cannot fast-forward $BRANCH.
      There are local commits or local edits here. Resolve by hand - do not
      force: nginx/conf.d and .env on this host carry real values."
  ok "now at $(git rev-parse --short HEAD)"
fi

# --------------------------------------------------------------------------
# 3. Rebuild and restart
#
# BEFORE the database script, not after. The script lives in the repo and
# is copied into the image by the Dockerfile, so an image built before the
# script existed does not contain it -- which is exactly what the first dry
# run on this server hit: "Cannot find module /app/scripts/
# emet-https-media.mjs". Building first means the container that runs the
# script is the one that has it.
# --------------------------------------------------------------------------
say "3/6  Rebuilding the app"
if [ "$ROOT_URLS" = "1" ]; then
  warn "--root given: building with EMET_BASE_PATH empty, so links come out
         root-relative. The PAGES still build under /emet - that is what
         nginx/conf.d/emet-root.conf.example exists to bridge. Step 5
         installs it; without that every link 404s."
  BUILD_ARGS="--build-arg EMET_BASE_PATH="
else
  BUILD_ARGS=""
fi

# shellcheck disable=SC2086
run $COMPOSE build $BUILD_ARGS
run $COMPOSE up -d

if [ "$APPLY" = "1" ]; then
  sleep 5
  docker inspect -f '{{.State.Running}}' "$EMET_CT" | grep -q true     || die "$EMET_CT did not come back up. Check: docker logs --tail 50 $EMET_CT"
  ok "$EMET_CT running"
fi

# --------------------------------------------------------------------------
# 4. Upgrade the embedded media URLs to https
# --------------------------------------------------------------------------
say "4/6  Upgrading embedded media URLs to https"
# Run inside the app container: it has node and the pg module, and it can
# reach the database over the compose network without a published port.
DB_URL_IN_CT="postgresql://$DB_USER:$DB_PASS@$EMET_DB_CT:5432/$DB_NAME"

# Under a dry run the rebuild above did not happen, so the running image is
# still the old one and the script may legitimately be missing from it.
# Say so rather than reporting it as a fault.
if [ "$APPLY" = "0" ]; then
  if docker exec "$EMET_CT" test -f scripts/emet-https-media.mjs 2>/dev/null; then
    step "script present in the current image; would dry-run then apply it"
  else
    step "script not in the CURRENT image - step 3's rebuild adds it, so this"
    step "  is expected on a dry run and is not a problem"
  fi
else
  step "dry run first"
  # PIPESTATUS, not $?: the pipe into sed would otherwise mask a failure
  # and the deploy would carry on past a script that never ran.
  set +e
  docker exec -e DATABASE_URL="$DB_URL_IN_CT" "$EMET_CT"     node scripts/emet-https-media.mjs 2>&1 | sed 's/^/      /'
  DRY_RC=${PIPESTATUS[0]}
  set -e
  if [ "$DRY_RC" != "0" ]; then
    die "the https script failed to run (exit $DRY_RC) even after the rebuild.
      The app is up on the new image and the database is untouched; only
      this content fix did not run. Check that the image contains
      scripts/emet-https-media.mjs and that $EMET_CT can reach $EMET_DB_CT."
  fi

  docker exec -e DATABASE_URL="$DB_URL_IN_CT" "$EMET_CT"     node scripts/emet-https-media.mjs --write 2>&1 | tail -8 | sed 's/^/      /'     || die "the https rewrite failed. Restore with:
      gunzip -c $DUMP | docker exec -i $EMET_DB_CT psql -U $DB_USER -d $DB_NAME"
  ok "media URLs upgraded"
fi

# --------------------------------------------------------------------------
# 5. Optionally switch new.hineni.io to root URLs
# --------------------------------------------------------------------------
say "5/6  nginx"
if [ "$ROOT_URLS" = "1" ]; then
  SRC="$MAIN_DIR/nginx/conf.d/emet-root.conf.example"
  [ -f "$SRC" ] || die "$SRC not found. In $MAIN_DIR, run: git pull"

  NGINX_BAK="$MAIN_DIR/nginx/conf.d.bak.$STAMP"
  run cp -r "$MAIN_DIR/nginx/conf.d" "$NGINX_BAK"
  [ "$APPLY" = "1" ] && printf '%s\n' "$NGINX_BAK" > "$MAIN_DIR/.emet-deploy-last-nginx-backup"

  # Both files claim server_name new.hineni.io, so this is a swap, not an
  # addition - nginx would otherwise use whichever loaded first.
  run cp "$SRC" "$MAIN_DIR/nginx/conf.d/emet-root.conf"
  run rm -f "$MAIN_DIR/nginx/conf.d/emet.conf"

  if [ "$APPLY" = "1" ]; then
    docker exec "$NGINX_CT" nginx -t 2>&1 | sed 's/^/      /' || {
      rm -f "$MAIN_DIR/nginx/conf.d/emet-root.conf"
      cp -r "$NGINX_BAK"/. "$MAIN_DIR/nginx/conf.d/"
      docker exec "$NGINX_CT" nginx -s reload >/dev/null 2>&1 || true
      die "nginx rejected the config. Restored; the live site is untouched."
    }
    docker exec "$NGINX_CT" nginx -s reload
    ok "swapped emet.conf -> emet-root.conf and reloaded"
  fi
else
  # nginx still has to reload: it resolves the app's address once at
  # startup, so after a container replacement it holds a dead IP. That
  # presents as 404s on assets that plainly exist.
  if [ "$APPLY" = "1" ]; then
    docker exec "$NGINX_CT" nginx -s reload && ok "reloaded (picks up the new app IP)"
  else
    step "would reload nginx"
  fi
fi

# --------------------------------------------------------------------------
# 6. Verify
# --------------------------------------------------------------------------
say "6/6  Verifying"
if [ "$APPLY" = "0" ]; then
  step "would check both sites respond"
  printf '\n\033[1;33mDry run finished.\033[0m Re-run with --apply to deploy.\n\n'
  exit 0
fi

sleep 3
FAIL=0
probe() {
  local label=$1 url=$2 want=$3 code
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$url" || echo 000)
  if [ "$code" = "$want" ]; then ok "$label -> $code"
  else warn "$label -> $code (expected $want)"; FAIL=1; fi
}

# The live site first and foremost.
probe "$MAIN_DOMAIN homepage" "https://$MAIN_DOMAIN/" 200

if [ "$ROOT_URLS" = "1" ]; then
  probe "$EMET_DOMAIN root"     "https://$EMET_DOMAIN/"          200
  probe "$EMET_DOMAIN chapters" "https://$EMET_DOMAIN/chapters"  200
  probe "$EMET_DOMAIN en"       "https://$EMET_DOMAIN/en"        200
else
  probe "$EMET_DOMAIN /emet"          "https://$EMET_DOMAIN/emet"          200
  probe "$EMET_DOMAIN /emet/chapters" "https://$EMET_DOMAIN/emet/chapters" 200
fi

# An unrecognised Host must reach the main site. A redirect here means the
# emet vhost became the implicit default again, which is how this host lost
# its main site twice.
UNK=$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: not-a-real-host.invalid' https://127.0.0.1/ || echo 000)
if [ "$UNK" = "200" ]; then ok "unknown Host -> 200 (main site)"
else warn "unknown Host -> $UNK (expected 200 from the main site)"; FAIL=1; fi

echo
if [ "$FAIL" = "0" ]; then
  printf '\033[1;32mDeployed.\033[0m\n'
else
  printf '\033[1;33mDeployed with failed checks above.\033[0m\n'
fi
cat <<NEXT

  Database backup:  $DUMP
  Rollback:         bash $MAIN_DIR/deploy/emet-deploy-rollback.sh

  Still to do by hand:
    - Roni's files from the old WordPress server (PDFs, poster images,
      wp-content/uploads/2012/07/) - upload via the admin, or copy them to
      their original paths so the links in the content keep working.
    - Confirm the new English pages sit in the "english" category:
        docker exec $EMET_DB_CT psql -U $DB_USER -d $DB_NAME \\
          -c "select p.slug, c.slug from posts p left join categories c \\
              on c.id=p.category_id where p.slug like 'en-source%' limit 10;"
      The /en/articles/[slug] route calls notFound() on any other category,
      so those pages would keep 404ing regardless of the cache fix.

NEXT
