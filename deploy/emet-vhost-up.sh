#!/usr/bin/env bash
#
# Puts EMETMATRIX on https://new.hineni.io behind the existing nginx.
#
# This exact change took the main site down twice before, both times for the
# same reason: nginx reads conf.d alphabetically and makes the FIRST server
# block on a port the implicit default for any Host it does not recognise.
# emet.conf sorts before site.conf, so it became that default and swallowed
# traffic meant for hineni.io. This script therefore claims default_server
# explicitly for the main site BEFORE emet.conf is ever written.
#
# Every step is verified before the next runs, the main site is re-checked
# the moment its own config changes, and any failure restores the backup.
#
# Run from /opt/twelvesteps. Safe to re-run.

set -Eeuo pipefail

STACK_DIR=${STACK_DIR:-/opt/twelvesteps}
NGINX_CT=${NGINX_CT:-twelvesteps-nginx}
APP_CT=${APP_CT:-twelvesteps-app}
EMET_CT=${EMET_CT:-emet-app}
DOMAIN=${DOMAIN:-hineni.io}
EMET_DOMAIN=${EMET_DOMAIN:-new.hineni.io}

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32mOK\033[0m   %s\n' "$*"; }
warn() { printf '    \033[33mWARN\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

cd "$STACK_DIR" || die "no such directory: $STACK_DIR"

# --------------------------------------------------------------------------
# 0. Preflight. Nothing is modified until all of these pass.
# --------------------------------------------------------------------------
say "0/7  Preflight"

[ -f nginx/conf.d/site.conf ] || die "nginx/conf.d/site.conf not found. Wrong directory?"

docker inspect -f '{{.State.Running}}' "$NGINX_CT" 2>/dev/null | grep -q true \
  || die "$NGINX_CT is not running."
ok "$NGINX_CT is up"

if ! docker inspect -f '{{.State.Running}}' "$EMET_CT" 2>/dev/null | grep -q true; then
  # Locate the emet stack rather than naming a path that may not exist. A
  # `cd` to a missing directory fails but does not stop a following
  # `&& docker compose up`... except it does, which is why the chain below
  # is written with && and not ;. The real hazard this guards against is an
  # operator pasting the two as separate lines: the cd fails, the compose
  # runs in whatever directory they were in, and if that is the main stack
  # it acts on the wrong site. That has happened on this host before.
  EMET_DIR=""
  # /opt/emetmatrix first: it is where the stack actually lives on this
  # host. The rest are guesses kept for a differently-laid-out machine.
  for d in /opt/emetmatrix /opt/emet /opt/emet-site /srv/emet /root/emet; do
    if [ -f "$d/docker-compose.yml" ] || [ -f "$d/docker-compose.prod.yml" ]; then
      EMET_DIR="$d"
      break
    fi
  done
  # Fall back to asking docker where the stopped container's stack lives.
  if [ -z "$EMET_DIR" ]; then
    EMET_DIR=$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' "$EMET_CT" 2>/dev/null || true)
  fi

  if [ -n "$EMET_DIR" ] && [ -d "$EMET_DIR" ]; then
    die "$EMET_CT is not running. Start the emet stack first:

      cd $EMET_DIR && docker compose --env-file .env up -d

      Run that as ONE command, exactly as written. If the cd fails on its
      own line, the compose command acts on whichever stack you are
      standing in - and in $STACK_DIR that is the live site."
  fi

  die "$EMET_CT is not running, and its stack directory could not be found.

      Find it with:
        docker inspect $EMET_CT --format '{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}'
        ls -d /opt/*/

      Then, as ONE command:
        cd <that directory> && docker compose --env-file .env up -d

      Do NOT run docker compose from $STACK_DIR to start emet: that
      directory is the live site's stack."
fi
ok "$EMET_CT is up"

# If site.conf still holds the template placeholder then something restored
# an unprocessed copy; editing it now would produce a config serving nothing.
if grep -q 'DOMAIN_PLACEHOLDER' nginx/conf.d/site.conf; then
  die "site.conf still contains DOMAIN_PLACEHOLDER - it was never processed
      for this host. Fix that first; do not run this script against it."
fi
ok "site.conf names a real domain"

# The certificate must exist before nginx loads a block referencing it, or
# the reload fails and takes the running config down with it.
if [ ! -f "certbot/conf/live/$EMET_DOMAIN/fullchain.pem" ]; then
  # Run the certbot image directly rather than through compose. The compose
  # service overrides entrypoint with a renewal loop, so `compose run certbot
  # certonly ...` appends the arguments to that sh -c and never reaches
  # certbot. The service also lives only in docker-compose.prod.yml, so a
  # bare `docker compose` reports "no such service: certbot".
  #
  # --webroot writes the challenge into the volume nginx already serves
  # /.well-known/acme-challenge/ from, so this needs no downtime.
  die "No certificate for $EMET_DOMAIN. Issue one first:

      cd $STACK_DIR
      docker run --rm \\
        -v \"\$PWD/certbot/conf:/etc/letsencrypt\" \\
        -v \"\$PWD/certbot/www:/var/www/certbot\" \\
        certbot/certbot certonly --webroot -w /var/www/certbot \\
        -d $EMET_DOMAIN --agree-tos -n --register-unsafely-without-email

      DNS for $EMET_DOMAIN must already point at this server, and the main
      site must be up so nginx can serve the challenge over port 80."
fi
ok "certificate for $EMET_DOMAIN exists"

# Discovered, not guessed: compose prefixes network names with the project
# name, so this is not simply "internal", and guessing is how it broke before.
EMET_NET=$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$EMET_CT" | head -1)
[ -n "$EMET_NET" ] || die "could not determine the network of $EMET_CT"
ok "emet network: $EMET_NET"

# --------------------------------------------------------------------------
# 1. Backup
# --------------------------------------------------------------------------
say "1/7  Backing up current config"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="nginx/conf.d.bak.$STAMP"
cp -r nginx/conf.d "$BACKUP"
printf '%s\n' "$BACKUP" > .emet-vhost-last-backup
printf '%s\n' "$EMET_NET" > .emet-vhost-last-network
ok "saved to $STACK_DIR/$BACKUP"

# These are config snapshots, not an archive: the useful one is almost
# always the newest, and the script is safe to re-run, so without a cap a
# directory accumulates one per attempt. Five is enough to step back past a
# few bad runs. Mirrors deploy/backup.sh, which keeps 2 of its much larger
# database and media archives.
KEEP=${BACKUP_KEEP:-5}
STALE=$(ls -1d nginx/conf.d.bak.* 2>/dev/null | sort | head -n -"$KEEP")
if [ -n "$STALE" ]; then
  printf '%s\n' "$STALE" | while IFS= read -r old; do
    [ -n "$old" ] && rm -rf "$old"
  done
  ok "pruned $(printf '%s\n' "$STALE" | wc -l) old snapshot(s), keeping $KEEP"
fi

# Restores the backed-up config and reloads, then exits non-zero. Used at
# every point after the first edit, so a failure never leaves the main site
# running on a half-applied config.
restore_and_die() {
  rm -f nginx/conf.d/emet.conf
  cp -r "$BACKUP"/. nginx/conf.d/
  docker exec "$NGINX_CT" nginx -s reload >/dev/null 2>&1 || true
  die "$1"
}

# --------------------------------------------------------------------------
# 2. Claim default_server for the main site
# --------------------------------------------------------------------------
say "2/7  Claiming default_server for $DOMAIN"
if grep -q 'default_server' nginx/conf.d/site.conf; then
  ok "already claimed"
else
  sed -i \
    -e 's|^\( *\)listen 80;$|\1listen 80 default_server;|' \
    -e 's|^\( *\)listen \[::\]:80;$|\1listen [::]:80 default_server;|' \
    -e 's|^\( *\)listen 443 ssl;$|\1listen 443 ssl default_server;|' \
    -e 's|^\( *\)listen \[::\]:443 ssl;$|\1listen [::]:443 ssl default_server;|' \
    nginx/conf.d/site.conf
  grep -q 'listen 443 ssl default_server;' nginx/conf.d/site.conf \
    || restore_and_die "could not add default_server to site.conf. Restored."
  ok "claimed on ports 80 and 443"
fi

# --------------------------------------------------------------------------
# 3. Pin the upstream to a unique name, resolved per request
# --------------------------------------------------------------------------
say "3/7  Pinning upstream to $APP_CT"
if grep -q 'upstream_app' nginx/conf.d/site.conf; then
  ok "already pinned"
else
  # The compose alias `app` exists in BOTH stacks. Once nginx joins the emet
  # network that short name is ambiguous, and this site once proxied to the
  # other stack's app because of it. The container name is unique host-wide.
  #
  # resolver + variable makes nginx re-resolve per request. With a literal
  # hostname it caches the IP from startup, so every `restart app` left nginx
  # talking to a dead address - which looked like 404s on assets that existed.
  grep -q '^    gzip on;' nginx/conf.d/site.conf \
    || restore_and_die "no 'gzip on;' anchor found in site.conf. Restored."

  awk -v app="$APP_CT" '
    /^    gzip on;$/ && !inserted {
      print "    resolver 127.0.0.11 valid=10s ipv6=off;"
      print "    # A variable upstream is re-resolved per request. It also drops"
      print "    # the request URI, so $request_uri is appended at each proxy_pass."
      print "    set $upstream_app " app ":3000;"
      print ""
      inserted = 1
    }
    { print }
  ' nginx/conf.d/site.conf > nginx/conf.d/site.conf.tmp \
    || restore_and_die "awk failed while editing site.conf. Restored."
  mv nginx/conf.d/site.conf.tmp nginx/conf.d/site.conf

  sed -i 's|proxy_pass http://app:3000;|proxy_pass http://$upstream_app$request_uri;|g' \
    nginx/conf.d/site.conf

  grep -q 'set \$upstream_app' nginx/conf.d/site.conf \
    || restore_and_die "upstream variable was not inserted. Restored."
  if grep -q 'proxy_pass http://app:3000;' nginx/conf.d/site.conf; then
    restore_and_die "some proxy_pass lines still use the ambiguous name 'app'. Restored."
  fi
  ok "upstream pinned, resolved per request"
fi

# --------------------------------------------------------------------------
# 4. Test and reload with ONLY the main site changed, proving it survives its
#    own edit before emet is introduced at all.
# --------------------------------------------------------------------------
say "4/7  Testing config (main site only)"
docker exec "$NGINX_CT" nginx -t 2>&1 | sed 's/^/    /' \
  || restore_and_die "config test failed. Restored; nothing was reloaded."
docker exec "$NGINX_CT" nginx -s reload
sleep 2
MAIN=$(curl -sk -o /dev/null -w '%{http_code}' "https://$DOMAIN/" || echo 000)
[ "$MAIN" = "200" ] || restore_and_die "$DOMAIN returned $MAIN after the change. Restored."
ok "$DOMAIN still serving 200"

# --------------------------------------------------------------------------
# 5. Join the emet network so emet-app resolves
# --------------------------------------------------------------------------
say "5/7  Connecting nginx to $EMET_NET"
if docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$NGINX_CT" | grep -qw "$EMET_NET"; then
  ok "already connected"
else
  docker network connect "$EMET_NET" "$NGINX_CT"
  ok "connected"
fi
docker exec "$NGINX_CT" getent hosts "$EMET_CT" >/dev/null 2>&1 \
  || die "nginx still cannot resolve $EMET_CT. Undo with:
      docker network disconnect $EMET_NET $NGINX_CT"
ok "nginx resolves $EMET_CT"

# --------------------------------------------------------------------------
# 6. Add the emet vhost
# --------------------------------------------------------------------------
say "6/7  Installing the $EMET_DOMAIN vhost"
cat > nginx/conf.d/emet.conf <<CONF
# EMETMATRIX on $EMET_DOMAIN - a second site behind this nginx.
#
# This file sorts before site.conf, so nginx loads it FIRST. That is exactly
# how this host lost its main site twice: the first server block on a port
# becomes the implicit default for unrecognised Hosts. site.conf now claims
# default_server explicitly, so this file only answers for the name below.
#
# Do not add default_server here, and do not add a location = / outside this
# server block: both reach past server_name.

server {
    listen 80;
    listen [::]:80;
    server_name $EMET_DOMAIN;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name $EMET_DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$EMET_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$EMET_DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    client_max_body_size 30M;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # A test deployment, not a published site: keep it out of search results
    # so it cannot compete with the real domain later.
    add_header X-Robots-Tag "noindex, nofollow" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json
               image/svg+xml application/xml+rss;

    resolver 127.0.0.11 valid=10s ipv6=off;
    # Variable upstream: re-resolved per request, and it drops the request
    # URI, so \$request_uri is appended at each proxy_pass below.
    set \$upstream_emet $EMET_CT:3000;

    # The app is built with EMET_BASE_PATH=/emet and emits its own URLs under
    # that prefix, so only the bare root needs sending there.
    location = / { return 302 /emet/; }

    location / {
        proxy_pass http://\$upstream_emet\$request_uri;
        proxy_http_version 1.1;

        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }
}
CONF
ok "wrote nginx/conf.d/emet.conf"

docker exec "$NGINX_CT" nginx -t 2>&1 | sed 's/^/    /' || {
  rm -f nginx/conf.d/emet.conf
  docker exec "$NGINX_CT" nginx -s reload >/dev/null 2>&1 || true
  die "config test failed with emet.conf. Removed it; the main site is untouched."
}
docker exec "$NGINX_CT" nginx -s reload
sleep 2
ok "reloaded"

# --------------------------------------------------------------------------
# 7. Verify
# --------------------------------------------------------------------------
say "7/7  Verifying"
FAIL=0
probe() {
  local label=$1 url=$2 want=$3
  local code
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$url" || echo 000)
  if [ "$code" = "$want" ]; then ok "$label -> $code"
  else warn "$label -> $code (expected $want)"; FAIL=1; fi
}

probe "$DOMAIN homepage"   "https://$DOMAIN/"          200
probe "$EMET_DOMAIN /emet" "https://$EMET_DOMAIN/emet" 200
probe "$EMET_DOMAIN root"  "https://$EMET_DOMAIN/"     302

# THE regression test. An unrecognised Host must reach the main site, not
# emet. A 302 here means emet became the default again and the main site is
# about to start vanishing for some visitors.
UNK=$(curl -sk -o /dev/null -w '%{http_code}' -H 'Host: not-a-real-host.invalid' https://127.0.0.1/ || echo 000)
if [ "$UNK" = "200" ]; then
  ok "unknown Host -> 200 (main site). default_server is holding."
else
  warn "unknown Host -> $UNK (expected 200 from the main site)"
  FAIL=1
fi

echo
if [ "$FAIL" = "0" ]; then
  printf '\033[1;32mDone. https://%s/ now serves EMETMATRIX.\033[0m\n' "$EMET_DOMAIN"
  printf '%s is unchanged and remains the default for unknown hosts.\n' "$DOMAIN"
else
  printf '\033[1;33mFinished with failed checks above.\033[0m\n'
fi
printf '\n  Backup:   %s/%s\n' "$STACK_DIR" "$BACKUP"
printf '  Rollback: bash deploy/emet-vhost-down.sh\n\n'
