#!/usr/bin/env bash
set -euo pipefail

MAX_DISK_PERCENT="${MAX_DISK_PERCENT:-85}"
MAX_INODE_PERCENT="${MAX_INODE_PERCENT:-85}"
WATCH_PATHS="${WATCH_PATHS:-/ /srv /var}"
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
Alerte monitoring systeme RAP_APP

Serveur : $(hostname)
Date : $(date '+%Y-%m-%d %H:%M:%S %Z')

$message
EOF
  "$helper" "[RAP_APP] Alerte systeme sur $(hostname)" "$TMP_FILE" || true
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: commande manquante: $cmd" >&2
    exit 1
  fi
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

check_df_limit() {
  local path="$1"
  local limit="$2"
  local mode="$3"
  local line value

  if [ "$mode" = "disk" ]; then
    line="$(df -P "$path" | awk 'NR==2 {print $5}')"
  else
    line="$(df -Pi "$path" | awk 'NR==2 {print $5}')"
  fi

  value="${line%%%}"
  if [ -z "$value" ]; then
    echo "KO impossible de lire l'usage pour $path ($mode)" >&2
    return 1
  fi

  if [ "$value" -gt "$limit" ]; then
    echo "KO $mode trop eleve: path=$path value=${value}% limit=${limit}%" >&2
    return 1
  fi

  echo "OK $mode: path=$path value=${value}%"
}

require_command systemctl
require_command df
require_command awk
require_command ufw
require_command fail2ban-client

if ! check_service "ssh"; then
  send_failure_email "Le service ssh n'est pas actif."
  exit 1
fi
if ! check_service "fail2ban"; then
  send_failure_email "Le service fail2ban n'est pas actif."
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
if ! check_service "gunicorn_rapapp"; then
  send_failure_email "Le service gunicorn_rapapp n'est pas actif."
  exit 1
fi

ufw_status="$(ufw status | head -n 1 || true)"
if [ "$ufw_status" != "Status: active" ]; then
  send_failure_email "UFW n'est pas actif: $ufw_status"
  echo "KO ufw: $ufw_status" >&2
  exit 1
fi
echo "OK ufw: active"

if ! fail2ban-client status sshd >/dev/null; then
  send_failure_email "La jail fail2ban sshd n'est pas disponible."
  exit 1
fi
echo "OK fail2ban jail: sshd"

for path in $WATCH_PATHS; do
  if ! check_df_limit "$path" "$MAX_DISK_PERCENT" "disk"; then
    send_failure_email "Usage disque trop eleve sur $path"
    exit 1
  fi
  if ! check_df_limit "$path" "$MAX_INODE_PERCENT" "inode"; then
    send_failure_email "Usage inode trop eleve sur $path"
    exit 1
  fi
done

echo "Monitoring system root OK"
