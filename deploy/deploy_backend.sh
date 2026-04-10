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

echo "==> Backend deploy"
echo "APP_DIR=$APP_DIR"
echo "VENV_DIR=$VENV_DIR"
echo "REQUIREMENTS_FILE=$REQUIREMENTS_FILE"
echo "MEDIA_DIR=$MEDIA_DIR"
echo "LOG_DIR=$LOG_DIR"

cd "$APP_DIR"

mkdir -p "$MEDIA_DIR" "$LOG_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

"$PIP_BIN" install --upgrade pip wheel setuptools
"$PIP_BIN" install -r "$REQUIREMENTS_FILE"

"$PYTHON_BIN" manage.py migrate --noinput
"$PYTHON_BIN" manage.py collectstatic --noinput
"$PYTHON_BIN" manage.py check --deploy

chmod 600 "$APP_DIR/.env"

echo "==> Backend deploy done"
