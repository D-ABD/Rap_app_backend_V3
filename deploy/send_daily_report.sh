#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
LOG_DIR="${LOG_DIR:-/srv/apps/rap_app/logs}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups/rap_app}"
EMAIL_TO="${EMAIL_TO:-}"
TMP_FILE="$(mktemp)"

cleanup() {
  rm -f "$TMP_FILE"
}
trap cleanup EXIT

mkdir -p "$LOG_DIR"

latest_file() {
  local dir="$1"
  find "$dir" -maxdepth 1 -type f 2>/dev/null | sort | tail -n 1 || true
}

HTTP_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 20 https://rap.adserv.fr || echo 'ERR')"
API_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 20 https://rap.adserv.fr/api/ || echo 'ERR')"
GUNICORN_STATUS="$(systemctl is-active gunicorn_rapapp 2>/dev/null || echo unknown)"
NGINX_STATUS="$(systemctl is-active nginx 2>/dev/null || echo unknown)"
POSTGRES_STATUS="$(systemctl is-active postgresql 2>/dev/null || echo unknown)"
FAIL2BAN_STATUS="$(systemctl is-active fail2ban 2>/dev/null || echo unknown)"
DB_BACKUP="$(latest_file "$BACKUP_ROOT/db")"
MEDIA_BACKUP="$(latest_file "$BACKUP_ROOT/media")"

cat > "$TMP_FILE" <<EOF
Rapport quotidien RAP_APP

Date : $(date '+%Y-%m-%d %H:%M:%S %Z')
Serveur : $(hostname)

HTTP :
- frontend : $HTTP_CODE
- api : $API_CODE

Services :
- gunicorn_rapapp : $GUNICORN_STATUS
- nginx : $NGINX_STATUS
- postgresql : $POSTGRES_STATUS
- fail2ban : $FAIL2BAN_STATUS

Ressources :
$(uptime)

Memoire :
$(free -h)

Disque :
$(df -h / /srv /var)

Backups :
- db : ${DB_BACKUP:-aucun}
- media : ${MEDIA_BACKUP:-aucun}
EOF

"$APP_DIR/deploy/send_email_via_django.sh" "[RAP_APP] Rapport quotidien $(hostname)" "$TMP_FILE" "$EMAIL_TO"
