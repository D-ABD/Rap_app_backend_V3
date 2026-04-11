#!/usr/bin/env bash
set -euo pipefail

MAX_DISK_PERCENT="${MAX_DISK_PERCENT:-85}"
MAX_INODE_PERCENT="${MAX_INODE_PERCENT:-85}"
WATCH_PATHS="${WATCH_PATHS:-/ /srv /var}"

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

check_service "ssh"
check_service "fail2ban"
check_service "nginx"
check_service "postgresql"
check_service "gunicorn_rapapp"

ufw_status="$(ufw status | head -n 1 || true)"
if [ "$ufw_status" != "Status: active" ]; then
  echo "KO ufw: $ufw_status" >&2
  exit 1
fi
echo "OK ufw: active"

fail2ban-client status sshd >/dev/null
echo "OK fail2ban jail: sshd"

for path in $WATCH_PATHS; do
  check_df_limit "$path" "$MAX_DISK_PERCENT" "disk"
  check_df_limit "$path" "$MAX_INODE_PERCENT" "inode"
done

echo "Monitoring system root OK"
