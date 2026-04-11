#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
VENV_DIR="${VENV_DIR:-/srv/apps/rap_app/venv}"
PYTHON_BIN="${PYTHON_BIN:-$VENV_DIR/bin/python}"
PIP_BIN="${PIP_BIN:-$VENV_DIR/bin/pip}"
REQUIREMENTS_FILE="${REQUIREMENTS_FILE:-requirements-prod.txt}"
SHARED_DIR="${SHARED_DIR:-/srv/apps/rap_app/shared}"
MEDIA_DIR="${MEDIA_DIR:-$SHARED_DIR/media}"
LOG_DIR="${LOG_DIR:-/srv/apps/rap_app/logs}"
STATIC_DIR="${STATIC_DIR:-$APP_DIR/staticfiles}"
RUN_DEPLOY_CHECK="${RUN_DEPLOY_CHECK:-true}"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Erreur: la commande '$cmd' est introuvable." >&2
    exit 1
  fi
}

echo "==> Backend deploy"
echo "APP_DIR=$APP_DIR"
echo "VENV_DIR=$VENV_DIR"
echo "REQUIREMENTS_FILE=$REQUIREMENTS_FILE"
echo "MEDIA_DIR=$MEDIA_DIR"
echo "LOG_DIR=$LOG_DIR"
echo "STATIC_DIR=$STATIC_DIR"
echo "RUN_DEPLOY_CHECK=$RUN_DEPLOY_CHECK"

require_command python3

if [ ! -d "$APP_DIR" ]; then
  echo "Erreur: le dossier backend n'existe pas: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

if [ ! -f manage.py ]; then
  echo "Erreur: manage.py introuvable dans $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "Erreur: le fichier .env est introuvable dans $APP_DIR" >&2
  exit 1
fi

if [ ! -f "$REQUIREMENTS_FILE" ]; then
  echo "Erreur: fichier requirements introuvable: $REQUIREMENTS_FILE" >&2
  exit 1
fi

mkdir -p "$MEDIA_DIR" "$LOG_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Erreur: interpreteur Python du venv introuvable: $PYTHON_BIN" >&2
  exit 1
fi

if [ ! -x "$PIP_BIN" ]; then
  echo "Erreur: pip du venv introuvable: $PIP_BIN" >&2
  exit 1
fi

"$PIP_BIN" install --upgrade pip wheel setuptools
"$PIP_BIN" install -r "$REQUIREMENTS_FILE"

"$PYTHON_BIN" manage.py migrate --noinput
"$PYTHON_BIN" manage.py collectstatic --noinput

if [ ! -d "$STATIC_DIR" ]; then
  echo "Erreur: collectstatic n'a pas cree le dossier staticfiles: $STATIC_DIR" >&2
  exit 1
fi

if [ "$RUN_DEPLOY_CHECK" = "true" ]; then
  "$PYTHON_BIN" manage.py check --deploy
else
  "$PYTHON_BIN" manage.py check
fi

chmod 600 "$APP_DIR/.env"

echo "==> Backend deploy done"
