#!/usr/bin/env bash
# First-time server setup. Safe to re-run: every step checks before acting.
#
#   sudo bash deploy/setup.sh yourdomain.com you@example.com
#
# Installs Docker, opens the firewall, creates the uploads directory,
# writes the nginx config for your domain, and issues the TLS certificate.

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

# No domain yet is a normal state — a server can be bought and set up
# before DNS exists. In that mode everything is installed and the site runs
# over plain HTTP on the server's IP; re-running this script later with a
# real domain adds nginx and TLS on top without touching data.
NO_DOMAIN=0
if [ "$DOMAIN" = "--no-domain" ] || [ -z "$DOMAIN" ]; then
  NO_DOMAIN=1
  DOMAIN=""
elif [ -z "$EMAIL" ]; then
  echo "Usage: sudo bash deploy/setup.sh <domain> <email>"
  echo "   or: sudo bash deploy/setup.sh --no-domain    (HTTP on the IP, add TLS later)"
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo."
  exit 1
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo
echo "=== 1/7  system packages ==="
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg ufw ripgrep >/dev/null

echo "=== 2/7  docker ==="
if command -v docker >/dev/null 2>&1; then
  echo "  already installed: $(docker --version)"
else
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin >/dev/null
  systemctl enable --now docker
  echo "  installed: $(docker --version)"
fi

echo "=== 3/7  firewall ==="
# Order matters: allow SSH before enabling, or the next reconnect fails.
ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
echo "  open: 22, 80, 443 (5432 stays closed — the database is not exposed)"

echo "=== 4/7  uploads directory ==="
STORAGE_HOST="$(grep -E '^STORAGE_DIR_HOST=' .env 2>/dev/null | cut -d= -f2- || true)"
STORAGE_HOST="${STORAGE_HOST:-/var/lib/twelvesteps/media}"
mkdir -p "$STORAGE_HOST"
# 1001 is the nextjs user inside the container (see Dockerfile).
chown -R 1001:1001 "$STORAGE_HOST"
echo "  $STORAGE_HOST"

mkdir -p backups certbot/conf certbot/www

if [ "$NO_DOMAIN" -eq 1 ]; then
  echo "=== 5/7  nginx config — skipped (no domain yet) ==="
  echo "  the app will serve plain HTTP on this server's IP"
else
  echo "=== 5/7  nginx config for $DOMAIN ==="
  if grep -q "DOMAIN_PLACEHOLDER" nginx/conf.d/site.conf; then
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" nginx/conf.d/site.conf
    echo "  written"
  else
    echo "  already configured, leaving as is"
  fi
fi

echo "=== 6/7  .env ==="
if [ ! -f .env ]; then
  echo
  echo "  .env does not exist yet. Create it before continuing:"
  echo "     cp .env.production.example .env"
  echo "     nano .env"
  echo
  echo "  Generate the two secrets with:"
  echo "     openssl rand -base64 32   # POSTGRES_PASSWORD"
  echo "     openssl rand -hex 32      # SESSION_SECRET"
  echo
  exit 1
fi
for key in POSTGRES_PASSWORD SESSION_SECRET NEXT_PUBLIC_SITE_URL; do
  value="$(grep -E "^${key}=" .env | cut -d= -f2- || true)"
  if [ -z "$value" ]; then
    echo "  ERROR: $key is empty in .env"
    exit 1
  fi
done
echo "  present and filled"

echo "=== 7/7  TLS certificate ==="
if [ "$NO_DOMAIN" -eq 1 ]; then
  echo "  skipped — no domain yet"
  IP="$(curl -s --max-time 5 ifconfig.me || echo YOUR_SERVER_IP)"
  echo
  echo "Setup complete (HTTP only). Start the site with:"
  echo "    bash deploy/deploy.sh --no-domain"
  echo
  echo "It will be reachable at:  http://$IP"
  echo
  echo "When DNS is ready, point the domain here and run:"
  echo "    sudo bash deploy/setup.sh yourdomain.com you@example.com"
  echo "    bash deploy/deploy.sh"
  echo "Content and uploads are untouched by that."
  echo
  exit 0
fi

if [ -d "certbot/conf/live/$DOMAIN" ]; then
  echo "  already issued, skipping"
else
  echo "  starting nginx on port 80 for the ACME challenge..."
  # nginx will not start while its config references a certificate that
  # does not exist, so serve the challenge from a throwaway container.
  docker run --rm -d --name certbot-nginx \
    -p 80:80 \
    -v "$REPO_DIR/certbot/www:/usr/share/nginx/html" \
    nginx:1.27-alpine >/dev/null

  sleep 3

  set +e
  docker run --rm \
    -v "$REPO_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$REPO_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly --webroot -w /var/www/certbot \
      -d "$DOMAIN" -d "www.$DOMAIN" \
      --email "$EMAIL" --agree-tos --no-eff-email --non-interactive
  CERT_STATUS=$?
  set -e

  docker stop certbot-nginx >/dev/null 2>&1 || true

  if [ $CERT_STATUS -ne 0 ]; then
    echo
    echo "  Certificate request failed. Almost always DNS:"
    echo "    - $DOMAIN and www.$DOMAIN must both point at this server's IP"
    echo "    - DNS changes can take a few hours to propagate"
    echo "  Check with:  dig +short $DOMAIN"
    echo "  Then re-run this script."
    exit 1
  fi
  echo "  issued for $DOMAIN and www.$DOMAIN"
fi

echo
echo "Setup complete. Start the site with:"
echo "    bash deploy/deploy.sh"
echo
