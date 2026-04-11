#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups/rap_app}"
MEDIA_ROOT_DEFAULT="/srv/apps/rap_app/shared/media"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: la commande '$cmd' est introuvable." >&2
    exit 1
  fi
}

read_env() {
  local key="$1"
  local value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "$value"
}

require_command pg_dump
require_command tar
require_command gzip

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: fichier .env introuvable: $ENV_FILE" >&2
  exit 1
fi

DB_NAME="$(read_env DB_NAME)"
DB_USER="$(read_env DB_USER)"
DB_PASSWORD="$(read_env DB_PASSWORD)"
DB_HOST="$(read_env DB_HOST)"
DB_PORT="$(read_env DB_PORT)"
MEDIA_ROOT="${MEDIA_ROOT:-$(read_env MEDIA_ROOT)}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
MEDIA_ROOT="${MEDIA_ROOT:-$MEDIA_ROOT_DEFAULT}"

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Erreur: variables DB_NAME / DB_USER / DB_PASSWORD manquantes dans $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT/db" "$BACKUP_ROOT/media"

DB_FILE="$BACKUP_ROOT/db/${DB_NAME}_${TIMESTAMP}.dump"
MEDIA_FILE="$BACKUP_ROOT/media/media_${TIMESTAMP}.tar.gz"

echo "==> Backup PostgreSQL -> $DB_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --format=custom \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --file="$DB_FILE" \
  "$DB_NAME"

echo "==> Backup media -> $MEDIA_FILE"
tar -czf "$MEDIA_FILE" -C "$MEDIA_ROOT" .

echo "==> Retention ${RETENTION_DAYS} jours"
find "$BACKUP_ROOT/db" -type f -name '*.dump' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_ROOT/media" -type f -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup termine"
echo "DB: $DB_FILE"
echo "MEDIA: $MEDIA_FILE"
