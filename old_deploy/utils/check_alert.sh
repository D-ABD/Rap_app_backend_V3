#!/bin/bash
# =====================================================
#  check_alert.sh — RAP_APP
#  Vérifie les services critiques et envoie un mail d'alerte
#  Version : anti-spam + retour à la normale + PostgreSQL + API HTTP
# =====================================================
#
#  CONFIGURATION POSTGRESQL (obligatoire pour la vérif DB)
#  ------------------------------------------------------
#  Aucun mot de passe ne doit figurer dans ce script.
#  La connexion psql utilise le fichier .pgpass (ou PGPASSFILE).
#
#  Sur le serveur (exécution manuelle ou cron) :
#    1. Créer le fichier .pgpass dans le répertoire home de l'utilisateur
#       qui exécute le script (ex. /home/abd/.pgpass).
#    2. Une ligne par connexion, format :
#         hostname:port:database:username:password
#       Exemple pour ce script :
#         localhost:5432:rap_app_backend:abd:VOTRE_MOT_DE_PASSE_DB
#    3. Droits stricts (obligatoire, sinon psql ignore le fichier) :
#         chmod 600 /home/abd/.pgpass
#         chown abd:abd /home/abd/.pgpass
#    4. En cron : lancer le script avec le même utilisateur (abd), afin
#       que $HOME soit celui qui possède .pgpass.
#
#  Alternative : utiliser PGPASSFILE pour un emplacement personnalisé
#  (ex. /srv/rap_app/backend/.pgpass). Dans ce cas, définir PGPASSFILE
#  dans le crontab avant l'appel au script, et appliquer chmod 600 sur ce fichier.
#
# =====================================================

BASE_DIR="/srv/rap_app/backend"
LOG_DIR="$BASE_DIR/logs"
STATE_FILE="$LOG_DIR/.alert_state"
EMAIL_TO="adserv.fr@gmail.com"

mkdir -p "$LOG_DIR"
touch "$STATE_FILE"

# --- Fonction d’envoi ---
send_mail() {
  local subject="$1"
  local message="$2"
  {
    echo "Subject: $subject"
    echo "From: RAP_APP Alerts <adserv.fr@gmail.com>"
    echo "To: $EMAIL_TO"
    echo
    echo "$message"
  } | /usr/bin/msmtp -a default "$EMAIL_TO"
}

# --- Gestion de l’état ---
mark_alert_sent() { grep -q "$1" "$STATE_FILE" || echo "$1" >> "$STATE_FILE"; }
clear_alert() { sed -i "/$1/d" "$STATE_FILE"; }
is_alert_active() { grep -q "$1" "$STATE_FILE"; }

# =====================================================
# 1️⃣ Vérif Gunicorn
# =====================================================
SERVICE="gunicorn_rapapp"
if systemctl is-active --quiet "$SERVICE"; then
  if is_alert_active "$SERVICE"; then
    send_mail "✅ Gunicorn restauré" "Le service $SERVICE est de nouveau actif sur $(hostname)."
    clear_alert "$SERVICE"
  fi
else
  if ! is_alert_active "$SERVICE"; then
    send_mail "🚨 Gunicorn down" "Le service $SERVICE est inactif sur $(hostname)."
    mark_alert_sent "$SERVICE"
  fi
fi

# =====================================================
# 2️⃣ Vérif Nginx
# =====================================================
SERVICE="nginx"
if systemctl is-active --quiet "$SERVICE"; then
  if is_alert_active "$SERVICE"; then
    send_mail "✅ Nginx restauré" "Le service $SERVICE est de nouveau actif sur $(hostname)."
    clear_alert "$SERVICE"
  fi
else
  if ! is_alert_active "$SERVICE"; then
    send_mail "🚨 Nginx down" "Le service $SERVICE est inactif sur $(hostname)."
    mark_alert_sent "$SERVICE"
  fi
fi

# =====================================================
# 3️⃣ Vérif Espace disque
# =====================================================
DISK_USE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
THRESHOLD=90
if [ "$DISK_USE" -ge "$THRESHOLD" ]; then
  if ! is_alert_active "disk_full"; then
    send_mail "⚠️ Espace disque saturé" "Utilisation disque : ${DISK_USE}% sur $(hostname)"
    mark_alert_sent "disk_full"
  fi
else
  if is_alert_active "disk_full"; then
    send_mail "✅ Espace disque normalisé" "Utilisation actuelle : ${DISK_USE}% sur $(hostname)"
    clear_alert "disk_full"
  fi
fi

# =====================================================
# 4️⃣ Vérif PostgreSQL
# Connexion sans mot de passe en clair : utilisation de ~/.pgpass
# (ou du fichier pointé par PGPASSFILE si défini).
# Format .pgpass : hostname:port:database:username:password
# Exemple : localhost:5432:rap_app_backend:abd:votre_mot_de_passe
# Droits requis : chmod 600 sur le fichier .pgpass (obligatoire).
# =====================================================
DB_NAME="rap_app_backend"
DB_USER="abd"
DB_HOST="localhost"
DB_PORT="${DB_PORT:-5432}"

if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -p "$DB_PORT" -c '\q' >/dev/null 2>&1; then
  if is_alert_active "postgres_down"; then
    send_mail "✅ PostgreSQL restauré" "Connexion à la base $DB_NAME rétablie sur $(hostname)."
    clear_alert "postgres_down"
  fi
else
  if ! is_alert_active "postgres_down"; then
    send_mail "🚨 PostgreSQL down" "Impossible de se connecter à la base $DB_NAME sur $(hostname)."
    mark_alert_sent "postgres_down"
  fi
fi

# =====================================================
# 5️⃣ Vérif HTTP API (https://rap.adserv.fr/api/health/)
# =====================================================
API_URL="https://rap.adserv.fr/api/health/"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$API_URL")

if [ "$HTTP_CODE" -eq 200 ]; then
  if is_alert_active "api_down"; then
    send_mail "✅ API restaurée" "L’API répond de nouveau correctement (HTTP $HTTP_CODE) sur $(hostname)."
    clear_alert "api_down"
  fi
else
  if ! is_alert_active "api_down"; then
    send_mail "🚨 API inaccessible" "L’API ne répond pas correctement (code HTTP $HTTP_CODE) sur $(hostname)."
    mark_alert_sent "api_down"
  fi
fi

# =====================================================
# 6️⃣ Log final
# =====================================================
echo "$(date '+%Y-%m-%d %H:%M:%S') — check_alert exécuté avec succès" >> "$LOG_DIR/check_alert.log"
