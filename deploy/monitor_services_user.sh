#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/apps/rap_app}"
FRONT_DIR="${FRONT_DIR:-/var/www/rap_app_front}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups/rap_app}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-36}"
APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
TMP_FILE=""

cleanup() {
  [ -n "$TMP_FILE" ] && rm -f "$TMP_FILE"
}
trap cleanup EXIT

send_failure_email() {
  local message="$1"
  local helper="$APP_DIR/deploy/send_email_via_django.sh"
  if [ ! -x "$helper" ]; then
    return 0
  fi

  TMP_FILE="$(mktemp)"
  cat > "$TMP_FILE" <<EOF
Alerte monitoring services RAP_APP

Serveur : $(hostname)
Date : $(date '+%Y-%m-%d %H:%M:%S %Z')

$message
EOF
  "$helper" "[RAP_APP] Alerte services sur $(hostname)" "$TMP_FILE" || true
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: commande manquante: $cmd" >&2
    exit 1
  fi
}

check_path() {
  local path="$1"
  if [ ! -e "$path" ]; then
    echo "KO chemin manquant: $path" >&2
    return 1
  fi
  echo "OK chemin: $path"
}

check_service() {
  local service="$1"
  local status
  status="$(systemctl is-active "$service" 2>/dev/null || true)"
  if [ "$status" != "active" ]; then
    echo "KO service: $service status=$status" >&2
    return 1
  fi
  echo "OK service: $service"
}

check_recent_backup() {
  local dir="$1"
  local label="$2"
  local latest
  latest="$(find "$dir" -maxdepth 1 -type f | sort | tail -n 1 || true)"
  if [ -z "$latest" ]; then
    echo "KO backup manquant: $label" >&2
    return 1
  fi

  local mtime now age_hours
  mtime="$(stat -c %Y "$latest")"
  now="$(date +%s)"
  age_hours="$(( (now - mtime) / 3600 ))"

  if [ "$age_hours" -gt "$MAX_BACKUP_AGE_HOURS" ]; then
    echo "KO backup trop ancien: $label age=${age_hours}h fichier=$latest" >&2
    return 1
  fi

  echo "OK backup: $label age=${age_hours}h fichier=$latest"
}

require_command systemctl
require_command find
require_command stat

if ! check_path "$APP_ROOT/app"; then
  send_failure_email "Le dossier applicatif est introuvable: $APP_ROOT/app"
  exit 1
fi
if ! check_path "$APP_ROOT/venv"; then
  send_failure_email "Le venv est introuvable: $APP_ROOT/venv"
  exit 1
fi
if ! check_path "$FRONT_DIR/index.html"; then
  send_failure_email "Le build frontend n'est pas trouve: $FRONT_DIR/index.html"
  exit 1
fi
if ! check_path "$BACKUP_ROOT/db"; then
  send_failure_email "Le dossier de backup DB est introuvable: $BACKUP_ROOT/db"
  exit 1
fi
if ! check_path "$BACKUP_ROOT/media"; then
  send_failure_email "Le dossier de backup media est introuvable: $BACKUP_ROOT/media"
  exit 1
fi

if ! check_service "gunicorn_rapapp"; then
  send_failure_email "Le service gunicorn_rapapp n'est pas actif."
  exit 1
fi
if ! check_service "nginx"; then
  send_failure_email "Le service nginx n'est pas actif."
  exit 1
fi
if ! check_service "postgresql"; then
  send_failure_email "Le service postgresql n'est pas actif."
  exit 1
fi

if ! check_recent_backup "$BACKUP_ROOT/db" "db"; then
  send_failure_email "Le backup DB est absent ou trop ancien."
  exit 1
fi
if ! check_recent_backup "$BACKUP_ROOT/media" "media"; then
  send_failure_email "Le backup media est absent ou trop ancien."
  exit 1
fi

echo "Monitoring services/paths OK"
