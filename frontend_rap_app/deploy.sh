#!/bin/bash
# =============================================
# 🚀 Déploiement Frontend RAP_APP (Vite + React + MUI)
# =============================================

set -euo pipefail
IFS=$'\n\t'

echo "--------------------------------------------"
echo "🔄 Déploiement FRONT — $(date)"
echo "--------------------------------------------"

APP_DIR="/srv/rap_app/front"
WEB_DIR="/var/www/rap_app_front"
REPO_URL="https://github.com/D-ABD/Rap_app_MUI.git"
BRANCH="main"

# --- Étape 1 : Vérification du dossier ---
if [ ! -d "$APP_DIR" ]; then
  echo "📁 Création du dossier $APP_DIR..."
  sudo mkdir -p "$APP_DIR"
  sudo chown -R abd:abd "$APP_DIR"
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR" || exit 1

# --- Étape 2 : Mise à jour du code ---
echo "📦 Mise à jour du code depuis GitHub..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# --- Étape 3 : Installation des dépendances ---
echo "📁 Installation des dépendances NPM..."
npm ci || npm install

# --- Étape 4 : Build de production ---
echo "🏗️  Build de production..."
cp .env.production .env
npm run build

# --- Étape 5 : Déploiement du build ---
echo "🧹 Nettoyage de l'ancien build..."
sudo rm -rf "${WEB_DIR:?}"/*

echo "📂 Copie du nouveau build..."
sudo mkdir -p "$WEB_DIR"
sudo cp -r dist/* "$WEB_DIR"/

sudo chown -R www-data:www-data "$WEB_DIR"

# --- Étape 6 : Reload Nginx ---
echo "🔁 Rechargement de Nginx..."
sudo systemctl reload nginx

# --- Étape 7 : Vérification HTTP ---
echo "🔍 Vérification rapide du site..."
curl -I https://rap.adserv.fr/ | grep -E "HTTP|content-type" || true

echo "✅ Déploiement FRONT terminé avec succès !"

