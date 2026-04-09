#!/bin/bash
# =============================================
# 🧰 Installation initiale Frontend RAP_APP (VPS)
# =============================================

set -euo pipefail
IFS=$'\n\t'

echo "--------------------------------------------"
echo "🧩 Installation du FRONTEND RAP_APP — $(date)"
echo "--------------------------------------------"

APP_DIR="/srv/rap_app/front"
WEB_DIR="/var/www/rap_app_front"
NGINX_CONF="/etc/nginx/conf.d/rap_front.conf"
USER="abd"

# --- Étape 1 : Mise à jour du système ---
echo "📦 Mise à jour du système..."
sudo apt update && sudo apt upgrade -y

# --- Étape 2 : Installation de Node.js et npm ---
if ! command -v node &>/dev/null; then
  echo "📥 Installation de Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "✅ Node.js est déjà installé : $(node -v)"
fi

# --- Étape 3 : Création des dossiers ---
echo "📁 Création des dossiers de déploiement..."
sudo mkdir -p "$APP_DIR" "$WEB_DIR" "$APP_DIR/logs"
sudo chown -R $USER:$USER "$APP_DIR"
sudo chown -R www-data:www-data "$WEB_DIR"

# --- Étape 4 : Installation du projet ---
if [ ! -d "$APP_DIR/.git" ]; then
  echo "🔗 Clonage du dépôt Git..."
  git clone https://github.com/D-ABD/Rap_app_MUI.git "$APP_DIR"
else
  echo "✅ Le projet est déjà cloné."
fi

cd "$APP_DIR"

echo "📁 Installation des dépendances NPM..."
npm ci || npm install

# --- Étape 5 : Configuration Nginx ---
if [ ! -f "$NGINX_CONF" ]; then
  echo "⚙️  Configuration de Nginx..."
  sudo cp "$APP_DIR/nginx_front.conf" "$NGINX_CONF"
  sudo nginx -t
  sudo systemctl reload nginx
else
  echo "✅ Configuration Nginx déjà présente."
fi

# --- Étape 6 : Vérification finale ---
echo "✅ Installation terminée avec succès !"
echo "➡️  Prochaine étape :"
echo "   cd $APP_DIR && ./deploy.sh"
