#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/apps/rap_app}"
FRONT_DIR="${FRONT_DIR:-/var/www/rap_app_front}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups/rap_app}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-36}"

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

check_path "$APP_ROOT/app"
check_path "$APP_ROOT/venv"
check_path "$FRONT_DIR/index.html"
check_path "$BACKUP_ROOT/db"
check_path "$BACKUP_ROOT/media"

check_service "gunicorn_rapapp"
check_service "nginx"
check_service "postgresql"

check_recent_backup "$BACKUP_ROOT/db" "db"
check_recent_backup "$BACKUP_ROOT/media" "media"

echo "Monitoring services/paths OK"
