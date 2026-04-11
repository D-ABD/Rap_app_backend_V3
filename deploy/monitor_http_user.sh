#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://rap.adserv.fr}"
API_URL="${API_URL:-https://rap.adserv.fr/api/}"
TIMEOUT="${TIMEOUT:-20}"

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

check_code "$APP_URL" "200" "frontend"
check_code "$API_URL" "401" "api"

echo "Monitoring HTTP OK"
