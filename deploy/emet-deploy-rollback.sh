#!/usr/bin/env bash
#
# Reverses deploy/emet-deploy.sh.
#
# Written to be run in a hurry, so it asks nothing and decides nothing:
# restore the nginx config, restore the database dump, rebuild the app from
# the previous commit, and report whether the live site answered.
#
# Deliberately NOT run with -e. A partial rollback is worse than a noisy
# one, so each step continues past failure and the exit code reflects only
# whether the main site is serving at the end - the single outcome that
# matters here.
#
#   bash deploy/emet-deploy-rollback.sh              # nginx + app only
#   bash deploy/emet-deploy-rollback.sh --database   # also restore the dump
#
# The database is NOT restored unless asked: the https rewrite is harmless
# to leave in place, and a restore would also discard any content edited in
# the admin since the deploy.

set -uo pipefail

RESTORE_DB=0
for a in "$@"; do
  case "$a" in
    --database) RESTORE_DB=1 ;;
    *) echo "unknown option: $a" >&2; exit 1 ;;
  esac
done

EMET_DIR=${EMET_DIR:-/opt/emetmatrix}
MAIN_DIR=${MAIN_DIR:-/opt/twelvesteps}
EMET_CT=${EMET_CT:-emet-app}
EMET_DB_CT=${EMET_DB_CT:-emet-postgres}
NGINX_CT=${NGINX_CT:-twelvesteps-nginx}
MAIN_DOMAIN=${MAIN_DOMAIN:-hineni.io}
# Read from the container below, not assumed: this stack does not
# necessarily use the postgres superuser.
DB_USER=${DB_USER:-}
DB_NAME=${DB_NAME:-}
DB_PASS=${DB_PASS:-}

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
warn() { printf '    \033[33mWARN\033[0m %s\n' "$*"; }

# --------------------------------------------------------------------------
# 1. nginx: put back whatever was there before the swap
# --------------------------------------------------------------------------
say "1/4  Restoring nginx config"
NGINX_BAK=""
[ -f "$MAIN_DIR/.emet-deploy-last-nginx-backup" ] && NGINX_BAK=$(cat "$MAIN_DIR/.emet-deploy-last-nginx-backup")
if [ -z "$NGINX_BAK" ] || [ ! -d "$NGINX_BAK" ]; then
  NGINX_BAK=$(ls -1d "$MAIN_DIR"/nginx/conf.d.bak.* 2>/dev/null | sort | tail -1)
fi

if [ -n "$NGINX_BAK" ] && [ -d "$NGINX_BAK" ]; then
  # Remove the root-URL vhost first: the backup predates it, so copying
  # over the top would leave it in place beside the restored emet.conf and
  # both claim the same server_name.
  rm -f "$MAIN_DIR/nginx/conf.d/emet-root.conf"
  if cp -r "$NGINX_BAK"/. "$MAIN_DIR/nginx/conf.d/"; then
    ok "restored from $NGINX_BAK"
  else
    warn "restore from $NGINX_BAK failed - check $MAIN_DIR/nginx/conf.d by hand"
  fi
else
  warn "no nginx backup found - leaving the config alone"
fi

# --------------------------------------------------------------------------
# 2. Roll the code back one commit and rebuild
# --------------------------------------------------------------------------
say "2/4  Rebuilding the app from the previous commit"
# Put EMET_BASE_PATH back BEFORE rebuilding. The deploy's --root empties it
# so the app emits root-relative links, and step 1 above has just restored
# the nginx config that serves the site under /emet again. Rebuilding
# without this would pair /emet pages with root-relative links and every
# link on the site would 404 - a worse state than the one being rolled
# back from.
if [ -d "$EMET_DIR" ]; then
  ENV_BAK=$(ls -1 "$EMET_DIR"/.env.bak.* 2>/dev/null | sort | tail -1)
  if [ -n "$ENV_BAK" ] && [ -f "$ENV_BAK" ]; then
    if cp "$ENV_BAK" "$EMET_DIR/.env"; then
      ok "restored .env from $ENV_BAK"
    else
      warn "could not restore $ENV_BAK - check $EMET_DIR/.env by hand"
    fi
  elif grep -q '^EMET_BASE_PATH=$' "$EMET_DIR/.env" 2>/dev/null; then
    # No backup, but the value is empty, which the /emet vhost cannot serve.
    if sed -i 's|^EMET_BASE_PATH=$|EMET_BASE_PATH=/emet|' "$EMET_DIR/.env"; then
      ok "no .env backup found; set EMET_BASE_PATH=/emet to match the restored vhost"
    else
      warn "EMET_BASE_PATH is empty in $EMET_DIR/.env and could not be set.
         Set it to /emet by hand before the rebuild, or links will 404."
    fi
  else
    ok ".env needs no change"
  fi
fi

if cd "$EMET_DIR" 2>/dev/null; then
  COMPOSE_FILE=${COMPOSE_FILE:-}
  if [ -z "$COMPOSE_FILE" ]; then
    COMPOSE_FILE=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$EMET_CT" 2>/dev/null | tr ',' '\n' | head -1)
  fi

  if [ -n "$COMPOSE_FILE" ] && [ -f "$COMPOSE_FILE" ] \
     && ! grep -qE 'container_name:\s*twelvesteps-' "$COMPOSE_FILE"; then
    if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
      git -c advice.detachedHead=false checkout HEAD~1 >/dev/null 2>&1 \
        && ok "checked out $(git rev-parse --short HEAD)" \
        || warn "could not move HEAD back - leaving the code as it is"
    else
      warn "no previous commit to go back to"
    fi
    docker compose -f "$COMPOSE_FILE" --env-file "$EMET_DIR/.env" build >/dev/null 2>&1 \
      && ok "rebuilt" || warn "rebuild failed - see: docker compose -f $COMPOSE_FILE build"
    docker compose -f "$COMPOSE_FILE" --env-file "$EMET_DIR/.env" up -d >/dev/null 2>&1 \
      && ok "restarted" || warn "restart failed"
  else
    warn "no safe compose file found for $EMET_CT - skipping the rebuild.
         Never run compose here with the default docker-compose.yml: it
         names the live site's containers."
  fi
else
  warn "$EMET_DIR not reachable - skipping the rebuild"
fi

# --------------------------------------------------------------------------
# 3. Database, only on request
# --------------------------------------------------------------------------
say "3/4  Database"
if [ "$RESTORE_DB" = "1" ]; then
  # Same discovery as the deploy script: a hardcoded "postgres" failed on
  # the server with `role "postgres" does not exist`.
  [ -n "$DB_USER" ] || DB_USER=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_USER"' 2>/dev/null || true)
  [ -n "$DB_NAME" ] || DB_NAME=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_DB"' 2>/dev/null || true)
  [ -n "$DB_PASS" ] || DB_PASS=$(docker exec "$EMET_DB_CT" sh -c 'printf %s "$POSTGRES_PASSWORD"' 2>/dev/null || true)
  DB_USER=${DB_USER:-postgres}
  DB_NAME=${DB_NAME:-emet}

  DUMP=""
  [ -f "$EMET_DIR/.emet-deploy-last-dump" ] && DUMP=$(cat "$EMET_DIR/.emet-deploy-last-dump")
  if [ -z "$DUMP" ] || [ ! -f "$DUMP" ]; then
    DUMP=$(ls -1 "$EMET_DIR"/backups/emet-*.sql.gz 2>/dev/null | sort | tail -1)
  fi

  if [ -n "$DUMP" ] && [ -f "$DUMP" ]; then
    warn "restoring $DUMP - this DISCARDS any admin edits made since the deploy"
    if gunzip -c "$DUMP" | docker exec -i -e PGPASSWORD="$DB_PASS" "$EMET_DB_CT" psql -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
      ok "database restored"
    else
      warn "restore failed. By hand:
         gunzip -c $DUMP | docker exec -i $EMET_DB_CT psql -U $DB_USER -d $DB_NAME"
    fi
  else
    warn "no dump found under $EMET_DIR/backups - database left as it is"
  fi
else
  ok "left untouched (pass --database to restore the dump)"
fi

# --------------------------------------------------------------------------
# 4. Reload nginx and check the live site
# --------------------------------------------------------------------------
say "4/4  Reloading nginx"
if docker exec "$NGINX_CT" nginx -t >/dev/null 2>&1; then
  ok "config test passed"
  docker exec "$NGINX_CT" nginx -s reload >/dev/null 2>&1 && ok "reloaded"
else
  warn "config test FAILED:"
  docker exec "$NGINX_CT" nginx -t 2>&1 | sed 's/^/      /'
  warn "trying a full restart"
  docker restart "$NGINX_CT" >/dev/null 2>&1 && ok "restarted" || warn "restart failed"
fi

sleep 3
MAIN=$(curl -sk -o /dev/null -w '%{http_code}' "https://$MAIN_DOMAIN/" 2>/dev/null || echo 000)

echo
if [ "$MAIN" = "200" ]; then
  printf '\033[1;32mRolled back. https://%s/ is serving 200.\033[0m\n\n' "$MAIN_DOMAIN"
  exit 0
fi

printf '\033[1;31m%s returned %s. NOT recovered.\033[0m\n\n' "$MAIN_DOMAIN" "$MAIN"
cat <<HINT
In order:

  1. What nginx is actually serving:
       docker exec $NGINX_CT nginx -T | grep -E 'server_name|listen|proxy_pass'

  2. Are the live site's containers up and on one network?
       docker ps --filter name=twelvesteps
       docker inspect twelvesteps-app --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}'
       docker inspect twelvesteps-postgres --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{\$k}} {{end}}'

     If those two print different networks, postgres was adopted by another
     compose project. Put it back with, from $MAIN_DIR:
       docker compose -f docker-compose.prod.yml --env-file .env up -d

  3. nginx caches the app's IP from startup; after a container replacement
     it can hold a dead one:
       docker restart $NGINX_CT

  4. Recent errors:
       docker logs --tail 50 twelvesteps-app
       docker logs --tail 50 $NGINX_CT

HINT
exit 1
