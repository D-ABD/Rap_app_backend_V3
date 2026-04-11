#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
FRONT_DIR="${FRONT_DIR:-$APP_DIR/frontend_rap_app}"
WEB_DIR="${WEB_DIR:-/var/www/rap_app_front}"
RUN_LINT="${RUN_LINT:-true}"
WEB_OWNER="${WEB_OWNER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"
SEND_DEPLOY_EMAIL="${SEND_DEPLOY_EMAIL:-true}"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: la commande '$cmd' est introuvable." >&2
    exit 1
  fi
}

echo "==> Frontend deploy"
echo "FRONT_DIR=$FRONT_DIR"
echo "WEB_DIR=$WEB_DIR"
echo "RUN_LINT=$RUN_LINT"
echo "WEB_OWNER=$WEB_OWNER"
echo "WEB_GROUP=$WEB_GROUP"
echo "SEND_DEPLOY_EMAIL=$SEND_DEPLOY_EMAIL"

require_command node
require_command npm
require_command rsync

if [ ! -d "$FRONT_DIR" ]; then
  echo "Erreur: le dossier frontend n'existe pas: $FRONT_DIR" >&2
  exit 1
fi

cd "$FRONT_DIR"

if [ ! -f package.json ]; then
  echo "Erreur: package.json introuvable dans $FRONT_DIR" >&2
  exit 1
fi

if [ ! -f package-lock.json ]; then
  echo "Erreur: package-lock.json introuvable. npm ci exige un lockfile." >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  cat > .env.production <<'EOF'
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
EOF
fi

npm ci

if [ "$RUN_LINT" = "true" ]; then
  npm run lint
fi

npm run build

if [ ! -d dist ]; then
  echo "Erreur: le build frontend n'a pas cree le dossier dist/." >&2
  exit 1
fi

if [ ! -f dist/index.html ]; then
  echo "Erreur: dist/index.html est introuvable apres le build." >&2
  exit 1
fi

sudo mkdir -p "$WEB_DIR"
sudo rsync -a --delete dist/ "$WEB_DIR"/

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "Erreur: index.html n'a pas ete copie dans $WEB_DIR." >&2
  exit 1
fi

sudo chown -R "$WEB_OWNER:$WEB_GROUP" "$WEB_DIR"

if [ "$SEND_DEPLOY_EMAIL" = "true" ] && [ -x "$APP_DIR/deploy/send_deploy_notification.sh" ]; then
  "$APP_DIR/deploy/send_deploy_notification.sh" "frontend"
fi

echo "==> Frontend deploy done"
