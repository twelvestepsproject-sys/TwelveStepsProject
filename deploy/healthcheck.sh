#!/usr/bin/env bash
# Checks that the deployed site is healthy.
#
#   bash deploy/healthcheck.sh
#
# Read-only: it starts nothing, changes nothing, and is safe to run at any
# time. Everything it reports is something that has actually gone wrong at
# least once on this deployment, which is why each check exists.
#
# Exits non-zero if any check fails, so it also works from cron.

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

DOMAIN="${HEALTHCHECK_DOMAIN:-hineni.io}"
COMPOSE="docker compose -f docker-compose.prod.yml"
[ -f docker-compose.no-domain.yml ] && grep -q "DOMAIN_PLACEHOLDER" nginx/conf.d/site.conf 2>/dev/null &&
  COMPOSE="$COMPOSE -f docker-compose.no-domain.yml"

PASS=0
FAIL=0
ok()   { echo "  [ OK ]  $1"; PASS=$((PASS+1)); }
bad()  { echo "  [FAIL]  $1"; FAIL=$((FAIL+1)); }
note() { echo "          $1"; }

echo
echo "==============================================="
echo " health check — $DOMAIN"
echo " $(date '+%Y-%m-%d %H:%M')"
echo "==============================================="

# ---------------------------------------------------------------- containers
echo
echo "CONTAINERS"
for svc in postgres app nginx certbot; do
  status="$($COMPOSE ps --format '{{.Service}} {{.State}}' 2>/dev/null | awk -v s="$svc" '$1==s {print $2}')"
  if [ "$status" = "running" ]; then
    ok "$svc is running"
  elif [ -z "$status" ]; then
    bad "$svc is NOT running"
  else
    bad "$svc is '$status'"
  fi
done

# The database answering is a stronger signal than the container being up:
# postgres reports running well before it accepts connections.
if $COMPOSE exec -T postgres pg_isready -q 2>/dev/null; then
  ok "database accepts connections"
else
  bad "database is not accepting connections"
fi

# ---------------------------------------------------------------- the site
echo
echo "SITE"
check_url() {
  local path="$1" expect="$2" label="$3"
  local code
  code="$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' "https://${DOMAIN}${path}" 2>/dev/null)"
  if [ "$code" = "$expect" ]; then ok "$label ($code)"; else bad "$label — got $code, expected $expect"; fi
}
check_url "/"            200 "homepage"
check_url "/blog"        200 "articles"
check_url "/odot"        200 "about"
check_url "/robots.txt"  200 "robots.txt"
check_url "/sitemap.xml" 200 "sitemap"
check_url "/favicon.ico" 200 "favicon"

# A plain-http request must redirect, not serve. This broke once when nginx
# came up without a certificate.
redirect="$(curl -s -o /dev/null --max-time 20 -w '%{http_code}' "http://${DOMAIN}/" 2>/dev/null)"
if [ "$redirect" = "301" ] || [ "$redirect" = "308" ]; then
  ok "http redirects to https ($redirect)"
else
  bad "http did not redirect — got $redirect"
fi

# ---------------------------------------------------------------- tls
echo
echo "CERTIFICATE"
expiry="$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null |
          openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
if [ -n "$expiry" ]; then
  exp_epoch="$(date -d "$expiry" +%s 2>/dev/null || echo 0)"
  now_epoch="$(date +%s)"
  days=$(( (exp_epoch - now_epoch) / 86400 ))
  if   [ "$days" -lt 0 ];  then bad "certificate EXPIRED $((-days)) days ago"
  elif [ "$days" -lt 10 ]; then bad "certificate expires in $days days — renewal is failing"
  elif [ "$days" -lt 30 ]; then ok "certificate valid, $days days left (renewal window is open)"
  else ok "certificate valid, $days days left"
  fi
else
  bad "could not read the certificate"
fi

# ---------------------------------------------------------------- backups
echo
echo "BACKUPS"
db_count="$(find backups -maxdepth 1 -name 'db-*.sql.gz' -type f 2>/dev/null | wc -l)"
media_count="$(find backups -maxdepth 1 -name 'media-*.tar.gz' -type f 2>/dev/null | wc -l)"
[ "$db_count"    -gt 0 ] && ok "database backups: $db_count"    || bad "no database backups"
[ "$media_count" -gt 0 ] && ok "media backups: $media_count"    || bad "no media backups"

newest="$(find backups -maxdepth 1 -name 'db-*.sql.gz' -type f 2>/dev/null | sort | tail -1)"
if [ -n "$newest" ]; then
  age_days=$(( ( $(date +%s) - $(date -r "$newest" +%s) ) / 86400 ))
  if [ "$age_days" -le 7 ]; then ok "newest backup is ${age_days}d old"
  else bad "newest backup is ${age_days}d old — backups may not be running"
  fi
fi

# ---------------------------------------------------------------- disk
echo
echo "DISK"
used_pct="$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')"
avail="$(df -h --output=avail / 2>/dev/null | tail -1 | tr -d ' ')"
if [ -n "$used_pct" ]; then
  if   [ "$used_pct" -ge 90 ]; then bad "disk ${used_pct}% full, only $avail free"
  elif [ "$used_pct" -ge 80 ]; then ok "disk ${used_pct}% full, $avail free (watch this)"
  else ok "disk ${used_pct}% full, $avail free"
  fi
fi

# ---------------------------------------------------------------- errors
echo
echo "RECENT ERRORS"
errs="$($COMPOSE logs --tail 200 app 2>/dev/null | grep -ciE '⨯|error:' || true)"
if [ "${errs:-0}" -eq 0 ]; then
  ok "no errors in the last 200 app log lines"
else
  bad "$errs error lines in the recent app log"
  note "see them with:  $COMPOSE logs --tail 200 app | grep -iE '⨯|error:'"
fi

# ---------------------------------------------------------------- code
echo
echo "CODE"
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
if [ -n "$branch" ] && git fetch --quiet origin "$branch" 2>/dev/null; then
  local_sha="$(git rev-parse HEAD)"
  remote_sha="$(git rev-parse "origin/$branch" 2>/dev/null || echo '')"
  if [ "$local_sha" = "$remote_sha" ]; then
    ok "up to date with origin/$branch"
  else
    behind="$(git rev-list --count "$local_sha".."$remote_sha" 2>/dev/null || echo '?')"
    bad "$behind commit(s) behind origin/$branch — run: git pull && bash deploy/deploy.sh"
  fi
else
  note "could not reach the remote (offline or no credentials) — skipped"
fi

# ---------------------------------------------------------------- summary
echo
echo "==============================================="
if [ "$FAIL" -eq 0 ]; then
  echo " ALL $PASS CHECKS PASSED"
else
  echo " $PASS passed, $FAIL FAILED — see [FAIL] above"
fi
echo "==============================================="
echo

[ "$FAIL" -eq 0 ]
