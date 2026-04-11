#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/srv/apps/rap_app/app}"
VENV_DIR="${VENV_DIR:-/srv/apps/rap_app/venv}"
PYTHON_BIN="${PYTHON_BIN:-$VENV_DIR/bin/python}"
SUBJECT="${1:-}"
BODY_FILE="${2:-}"
TO_ARG="${3:-}"
ATTACHMENTS_ARG="${4:-}"

if [ -z "$SUBJECT" ]; then
  echo "Usage: $0 \"Sujet\" /chemin/vers/body.txt [dest1,dest2]" >&2
  exit 1
fi

if [ -z "$BODY_FILE" ] || [ ! -f "$BODY_FILE" ]; then
  echo "Erreur: fichier body introuvable: $BODY_FILE" >&2
  exit 1
fi

if [ ! -x "$PYTHON_BIN" ]; then
  echo "Erreur: interpreteur Python introuvable: $PYTHON_BIN" >&2
  exit 1
fi

export DJANGO_SETTINGS_MODULE="rap_app_project.settings"
export MAIL_SUBJECT="$SUBJECT"
export MAIL_BODY_FILE="$BODY_FILE"
export MAIL_TO="$TO_ARG"
export MAIL_ATTACHMENTS="$ATTACHMENTS_ARG"

cd "$APP_DIR"

"$PYTHON_BIN" - <<'PY'
import os
import sys
from pathlib import Path

import django

django.setup()

from django.conf import settings
from django.core.mail import EmailMessage

subject = os.environ["MAIL_SUBJECT"]
body_path = Path(os.environ["MAIL_BODY_FILE"])
body = body_path.read_text(encoding="utf-8")

raw_to = os.environ.get("MAIL_TO", "").strip()
if raw_to:
    recipients = [x.strip() for x in raw_to.split(",") if x.strip()]
else:
    fallback = getattr(settings, "EMAIL_HOST_USER", "") or getattr(settings, "SERVER_EMAIL", "")
    recipients = [x.strip() for x in os.getenv("EMAIL_REPORT_TO", fallback).split(",") if x.strip()]

raw_attachments = os.environ.get("MAIL_ATTACHMENTS", "").strip()
attachments = [x.strip() for x in raw_attachments.split(",") if x.strip()]

if not recipients:
    print("Erreur: aucun destinataire email configure.", file=sys.stderr)
    sys.exit(1)

message = EmailMessage(
    subject=subject,
    body=body,
    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
    to=recipients,
)
for attachment in attachments:
    message.attach_file(attachment)
message.send(fail_silently=False)
print("Email envoye a:", ", ".join(recipients))
PY
