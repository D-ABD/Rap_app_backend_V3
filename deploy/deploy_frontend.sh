#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
FRONT_DIR="${FRONT_DIR:-$APP_DIR/frontend_rap_app}"
WEB_DIR="${WEB_DIR:-/var/www/rap_app_front}"

echo "==> Frontend deploy"
echo "FRONT_DIR=$FRONT_DIR"
echo "WEB_DIR=$WEB_DIR"

cd "$FRONT_DIR"

if [ ! -f .env.production ]; then
  cat > .env.production <<'EOF'
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
EOF
fi

npm ci
npm run build

sudo mkdir -p "$WEB_DIR"
sudo rsync -a --delete dist/ "$WEB_DIR"/
sudo chown -R www-data:www-data "$WEB_DIR"

echo "==> Frontend deploy done"
