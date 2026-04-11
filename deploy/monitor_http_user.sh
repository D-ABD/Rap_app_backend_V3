#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://rap.adserv.fr}"
API_URL="${API_URL:-https://rap.adserv.fr/api/}"
TIMEOUT="${TIMEOUT:-20}"
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
Alerte monitoring HTTP RAP_APP

Serveur : $(hostname)
Date : $(date '+%Y-%m-%d %H:%M:%S %Z')

$message
EOF
  "$helper" "[RAP_APP] Alerte monitoring HTTP sur $(hostname)" "$TMP_FILE" || true
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: commande manquante: $cmd" >&2
    exit 1
  fi
}

check_code() {
  local url="$1"
  local expected="$2"
  local label="$3"
  local code
  code="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url")"
  if [ "$code" != "$expected" ]; then
    echo "KO $label: attendu=$expected obtenu=$code url=$url" >&2
    return 1
  fi
  echo "OK $label: $code"
}

require_command curl

if ! check_code "$APP_URL" "200" "frontend"; then
  send_failure_email "Le frontend ne repond pas correctement sur $APP_URL"
  exit 1
fi

if ! check_code "$API_URL" "401" "api"; then
  send_failure_email "L'API ne repond pas avec le code attendu sur $API_URL"
  exit 1
fi

echo "Monitoring HTTP OK"
