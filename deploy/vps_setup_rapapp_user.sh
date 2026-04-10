#!/usr/bin/env bash
# A executer sur le VPS une fois, en root : sudo bash deploy/vps_setup_rapapp_user.sh
# Option : chemin vers gunicorn_rapapp.service (sinon contenu embarque).
set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Usage: sudo bash $0 [chemin/vers/gunicorn_rapapp.service]" >&2
  exit 1
fi

UNIT_SRC="${1:-}"

if ! getent group rapapp >/dev/null; then
  groupadd --system rapapp
  echo "==> Groupe systeme rapapp cree"
else
  echo "==> Groupe rapapp deja present"
fi

if ! id rapapp >/dev/null 2>&1; then
  useradd --system --gid rapapp --home /nonexistent --shell /usr/sbin/nologin rapapp
  echo "==> Utilisateur systeme rapapp cree"
else
  echo "==> Utilisateur rapapp deja present"
fi

usermod -aG rapapp www-data
echo "==> www-data ajoute au groupe rapapp (lecture static/media pour Nginx)"

mkdir -p /srv/apps/rap_app/app /srv/apps/rap_app/shared/media /srv/apps/rap_app/logs

chown -R rapapp:rapapp /srv/apps/rap_app
chmod -R o= /srv/apps/rap_app
chmod -R g+rX /srv/apps/rap_app
if [[ -f /srv/apps/rap_app/app/.env ]]; then
  chmod 600 /srv/apps/rap_app/app/.env
  chown rapapp:rapapp /srv/apps/rap_app/app/.env
fi
echo "==> Permissions /srv/apps/rap_app -> rapapp:rapapp, groupe en lecture (g+rX)"

if [[ -d /var/www/rap_app_front ]]; then
  chown -R www-data:www-data /var/www/rap_app_front
  echo "==> /var/www/rap_app_front -> www-data:www-data"
else
  echo "==> (info) /var/www/rap_app_front absent — rien a faire pour le front"
fi

if [[ -n "$UNIT_SRC" && -f "$UNIT_SRC" ]]; then
  install -m 0644 "$UNIT_SRC" /etc/systemd/system/gunicorn_rapapp.service
  echo "==> Unite systemd installee depuis $UNIT_SRC"
else
  cat >/etc/systemd/system/gunicorn_rapapp.service << 'EOF'
[Unit]
Description=Gunicorn RAP_APP
After=network.target

[Service]
User=rapapp
Group=rapapp
WorkingDirectory=/srv/apps/rap_app/app
EnvironmentFile=/srv/apps/rap_app/app/.env
ExecStart=/srv/apps/rap_app/venv/bin/gunicorn \
  --workers 2 \
  --bind 127.0.0.1:8000 \
  rap_app_project.wsgi:application
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
  echo "==> Unite systemd embarquee installee (User=rapapp Group=rapapp)"
fi

systemctl daemon-reload
systemctl enable gunicorn_rapapp 2>/dev/null || true
if [[ -x /srv/apps/rap_app/venv/bin/gunicorn ]] && [[ -f /srv/apps/rap_app/app/.env ]]; then
  systemctl restart gunicorn_rapapp
  echo "==> gunicorn_rapapp redemarre"
else
  echo "==> (info) venv ou .env manquant — gunicorn non redemarre (normal apres un wipe)"
fi

echo "==> Termine."
