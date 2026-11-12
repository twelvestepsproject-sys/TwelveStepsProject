#!/usr/bin/env bash
#
# Undoes deploy/emet-vhost-up.sh and returns nginx to serving only the main
# site. Written to be run in a hurry, so it makes no decisions that need
# thought: it restores the backup, removes the emet vhost, leaves the emet
# network, reloads, and reports whether the main site answered.
#
# It keeps going when a step fails rather than aborting part-way, because a
# partial rollback is worse than a noisy one. The exit code reflects whether
# the main site is actually serving at the end - that is the only outcome
# that matters here.
#
# Run from /opt/twelvesteps.
#
#   bash deploy/emet-vhost-down.sh                     # restore newest backup
#   bash deploy/emet-vhost-down.sh nginx/conf.d.bak.X  # restore a specific one

set -uo pipefail   # deliberately NOT -e: see above.

STACK_DIR=${STACK_DIR:-/opt/twelvesteps}
NGINX_CT=${NGINX_CT:-twelvesteps-nginx}
DOMAIN=${DOMAIN:-hineni.io}

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
warn() { printf '    \033[33mWARN\033[0m %s\n' "$*"; }

cd "$STACK_DIR" || { printf 'no such directory: %s\n' "$STACK_DIR" >&2; exit 1; }

# --------------------------------------------------------------------------
# Pick the backup: the argument, else the one the up-script recorded, else
# the newest on disk.
# --------------------------------------------------------------------------
say "0/4  Selecting backup"
BACKUP=${1:-}
if [ -z "$BACKUP" ] && [ -f .emet-vhost-last-backup ]; then
  BACKUP=$(cat .emet-vhost-last-backup)
fi
if [ -z "$BACKUP" ] || [ ! -d "$BACKUP" ]; then
  BACKUP=$(ls -1d nginx/conf.d.bak.* 2>/dev/null | sort | tail -1)
fi

if [ -n "$BACKUP" ] && [ -d "$BACKUP" ]; then
  ok "using $BACKUP"
else
  warn "no backup directory found - will remove emet.conf and reload as-is"
  BACKUP=""
fi

# --------------------------------------------------------------------------
# 1. Remove the emet vhost. Done even when a backup exists, since the backup
#    predates emet.conf and copying it over would not delete the file.
# --------------------------------------------------------------------------
say "1/4  Removing the emet vhost"
if [ -f nginx/conf.d/emet.conf ]; then
  rm -f nginx/conf.d/emet.conf && ok "removed nginx/conf.d/emet.conf"
else
  ok "not present"
fi

# --------------------------------------------------------------------------
# 2. Restore the backed-up config
# --------------------------------------------------------------------------
say "2/4  Restoring config"
if [ -n "$BACKUP" ]; then
  if cp -r "$BACKUP"/. nginx/conf.d/; then
    ok "restored from $BACKUP"
  else
    warn "restore from $BACKUP failed - check nginx/conf.d by hand"
  fi
  # The backup predates emet.conf, so a copy cannot remove it. Guard against
  # a stale one reappearing from the backup itself.
  rm -f nginx/conf.d/emet.conf
else
  warn "skipped (no backup)"
fi

# --------------------------------------------------------------------------
# 3. Leave the emet network
# --------------------------------------------------------------------------
say "3/4  Disconnecting from the emet network"
EMET_NET=""
[ -f .emet-vhost-last-network ] && EMET_NET=$(cat .emet-vhost-last-network)

if [ -z "$EMET_NET" ]; then
  # Fall back to any network on nginx that is not this stack's own.
  EMET_NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$NGINX_CT" 2>/dev/null \
             | grep -v '^$' | grep -vi 'twelvesteps' | head -1)
fi

if [ -n "$EMET_NET" ]; then
  if docker network disconnect "$EMET_NET" "$NGINX_CT" 2>/dev/null; then
    ok "disconnected from $EMET_NET"
  else
    ok "not connected to $EMET_NET"
  fi
else
  ok "nothing to disconnect"
fi

# --------------------------------------------------------------------------
# 4. Test, reload, and confirm the main site is actually serving
# --------------------------------------------------------------------------
say "4/4  Reloading nginx"
if docker exec "$NGINX_CT" nginx -t >/dev/null 2>&1; then
  ok "config test passed"
  docker exec "$NGINX_CT" nginx -s reload && ok "reloaded"
else
  warn "config test FAILED - showing the error:"
  docker exec "$NGINX_CT" nginx -t 2>&1 | sed 's/^/      /'
  warn "trying a full container restart instead"
  docker restart "$NGINX_CT" >/dev/null 2>&1 && ok "restarted" || warn "restart failed"
fi

sleep 3
MAIN=$(curl -sk -o /dev/null -w '%{http_code}' "https://$DOMAIN/" 2>/dev/null || echo 000)

echo
if [ "$MAIN" = "200" ]; then
  printf '\033[1;32mRolled back. https://%s/ is serving 200.\033[0m\n\n' "$DOMAIN"
  exit 0
fi

printf '\033[1;31m%s returned %s. NOT recovered.\033[0m\n\n' "$DOMAIN" "$MAIN"
cat <<HINT
Next things to try, in order:

  1. Look at what nginx is actually loading:
       docker exec $NGINX_CT nginx -T | grep -E 'server_name|listen|proxy_pass'

  2. Check the app container is alive and reachable:
       docker ps --filter name=twelvesteps
       docker exec $NGINX_CT getent hosts twelvesteps-app

  3. nginx caches an upstream IP from startup. After any app restart it can
     be talking to a dead address. A full restart clears it:
       docker restart $NGINX_CT

  4. Recent errors:
       docker logs --tail 50 $NGINX_CT

  5. List every backup and restore an older one explicitly:
       ls -1d nginx/conf.d.bak.*
       bash deploy/emet-vhost-down.sh nginx/conf.d.bak.<stamp>

HINT
exit 1
