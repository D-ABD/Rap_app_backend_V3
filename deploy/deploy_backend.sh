#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
VENV_DIR="${VENV_DIR:-/srv/apps/rap_app/venv}"
PYTHON_BIN="${PYTHON_BIN:-$VENV_DIR/bin/python}"
PIP_BIN="${PIP_BIN:-$VENV_DIR/bin/pip}"

echo "==> Backend deploy"
echo "APP_DIR=$APP_DIR"
echo "VENV_DIR=$VENV_DIR"

cd "$APP_DIR"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
fi

"$PIP_BIN" install --upgrade pip wheel setuptools
"$PIP_BIN" install -r requirements.txt

"$PYTHON_BIN" manage.py migrate --noinput
"$PYTHON_BIN" manage.py collectstatic --noinput
"$PYTHON_BIN" manage.py check --deploy

echo "==> Backend deploy done"
