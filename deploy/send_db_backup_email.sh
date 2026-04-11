#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-/srv/backups/rap_app}"
EMAIL_BACKUP_DIR="${EMAIL_BACKUP_DIR:-$BACKUP_ROOT/db_email}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
MAX_EMAIL_ATTACHMENT_MB="${MAX_EMAIL_ATTACHMENT_MB:-20}"
EMAIL_TO="${EMAIL_TO:-}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TMP_BODY="$(mktemp)"

cleanup() {
  rm -f "$TMP_BODY"
}
trap cleanup EXIT

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
require_command gzip
require_command find
require_command stat

if [ ! -f "$ENV_FILE" ]; then
  echo "Erreur: fichier .env introuvable: $ENV_FILE" >&2
  exit 1
fi

DB_NAME="$(read_env DB_NAME)"
DB_USER="$(read_env DB_USER)"
DB_PASSWORD="$(read_env DB_PASSWORD)"
DB_HOST="$(read_env DB_HOST)"
DB_PORT="$(read_env DB_PORT)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
  echo "Erreur: variables DB_NAME / DB_USER / DB_PASSWORD manquantes dans $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$EMAIL_BACKUP_DIR"

SQL_GZ_FILE="$EMAIL_BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "==> Dump DB compresse pour email -> $SQL_GZ_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-owner \
  --no-privileges \
  "$DB_NAME" | gzip -9 > "$SQL_GZ_FILE"

SIZE_BYTES="$(stat -c %s "$SQL_GZ_FILE")"
MAX_BYTES="$((MAX_EMAIL_ATTACHMENT_MB * 1024 * 1024))"
SIZE_MB="$(awk "BEGIN {printf \"%.2f\", $SIZE_BYTES/1024/1024}")"

if [ "$SIZE_BYTES" -gt "$MAX_BYTES" ]; then
  cat > "$TMP_BODY" <<EOF
Backup DB email RAP_APP

Date : $(date '+%Y-%m-%d %H:%M:%S %Z')
Serveur : $(hostname)
Base : $DB_NAME

Le fichier genere est trop volumineux pour l'envoi email.

Fichier : $SQL_GZ_FILE
Taille : ${SIZE_MB} MB
Limite : ${MAX_EMAIL_ATTACHMENT_MB} MB
EOF

  "$APP_DIR/deploy/send_email_via_django.sh" "[RAP_APP] Backup DB email trop volumineux sur $(hostname)" "$TMP_BODY" "$EMAIL_TO"
  echo "Erreur: fichier trop volumineux pour l'envoi email (${SIZE_MB} MB)." >&2
  exit 1
fi

cat > "$TMP_BODY" <<EOF
Backup DB email RAP_APP

Date : $(date '+%Y-%m-%d %H:%M:%S %Z')
Serveur : $(hostname)
Base : $DB_NAME
Fichier : $(basename "$SQL_GZ_FILE")
Taille : ${SIZE_MB} MB
Retention locale : ${RETENTION_DAYS} jours
EOF

"$APP_DIR/deploy/send_email_via_django.sh" "[RAP_APP] Backup DB quotidien $(hostname)" "$TMP_BODY" "$EMAIL_TO" "$SQL_GZ_FILE"

echo "==> Retention ${RETENTION_DAYS} jours"
find "$EMAIL_BACKUP_DIR" -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup DB email termine"
echo "Fichier : $SQL_GZ_FILE"
echo "Taille : ${SIZE_MB} MB"
