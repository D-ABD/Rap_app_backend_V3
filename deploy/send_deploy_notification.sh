#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
LOG_DIR="${LOG_DIR:-/srv/apps/rap_app/logs}"
HOSTNAME_FQDN="${HOSTNAME_FQDN:-$(hostname)}"
STAGE="${1:-deploy}"
EMAIL_TO="${EMAIL_TO:-}"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

mkdir -p "$LOG_DIR"

cd "$APP_DIR"

COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
DATE_NOW="$(date '+%Y-%m-%d %H:%M:%S %Z')"
GUNICORN_STATUS="$(systemctl is-active gunicorn_rapapp 2>/dev/null || echo unknown)"
NGINX_STATUS="$(systemctl is-active nginx 2>/dev/null || echo unknown)"
POSTGRES_STATUS="$(systemctl is-active postgresql 2>/dev/null || echo unknown)"

cat > "$TMP_FILE" <<EOF
Notification de deploiement RAP_APP

Date : $DATE_NOW
Serveur : $HOSTNAME_FQDN
Etape : $STAGE
Branche : $BRANCH
Commit : $COMMIT

Services :
- gunicorn_rapapp : $GUNICORN_STATUS
- nginx : $NGINX_STATUS
- postgresql : $POSTGRES_STATUS

URLs :
- https://rap.adserv.fr
- https://rap.adserv.fr/api/
EOF

"$APP_DIR/deploy/send_email_via_django.sh" "[RAP_APP] Deploiement $STAGE OK sur $HOSTNAME_FQDN" "$TMP_FILE" "$EMAIL_TO"
