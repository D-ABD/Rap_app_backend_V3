# Commandes Deploy

Commandes a executer sur la VPS pour deployer l'application sur `rap.adserv.fr`.

Contexte :

- VPS Ubuntu 24.04
- utilisateur VPS : `abd`
- repo : `https://github.com/D-ABD/Rap_app_backend_V3.git`
- branche : `main`
- domaine : `rap.adserv.fr`
- PostgreSQL local

---

## 1. Connexion SSH

```bash
ssh abd@147.93.126.119
```

---

## 2. Paquets systeme

```bash
sudo apt update
sudo apt install -y \
  python3 python3-venv python3-pip \
  postgresql postgresql-contrib \
  nginx git curl rsync \
  build-essential pkg-config \
  libpq-dev libmagic1 \
  libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi-dev libcairo2 \
  certbot python3-certbot-nginx
```

---

## 3. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 4. Arborescence serveur

```bash
sudo mkdir -p /srv/apps/rap_app/shared/media
sudo mkdir -p /srv/apps/rap_app/logs
sudo mkdir -p /var/www/rap_app_front
sudo chown -R abd:abd /srv/apps
sudo chown -R abd:abd /var/www/rap_app_front
sudo find /srv/apps -type d -exec chmod 755 {} \;
```

---

## 5. Cloner le repo

```bash
cd /srv/apps/rap_app
git clone -b main https://github.com/D-ABD/Rap_app_backend_V3.git app
cd /srv/apps/rap_app/app
```

---

## 6. Creer PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE rap_app_backend;
CREATE USER abd WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';
ALTER ROLE abd SET client_encoding TO 'utf8';
ALTER ROLE abd SET default_transaction_isolation TO 'read committed';
ALTER ROLE abd SET timezone TO 'Europe/Paris';
GRANT ALL PRIVILEGES ON DATABASE rap_app_backend TO abd;
\q
```

---

## 7. Creer le `.env`

```bash
cd /srv/apps/rap_app/app
cp deploy/prod.env.example .env
nano .env
chmod 600 .env
```

Dans `.env`, remplacer au minimum :

- `SECRET_KEY`
- `DB_PASSWORD`
- `EMAIL_HOST_PASSWORD`

---

## 8. Front env production

```bash
cd /srv/apps/rap_app/app/frontend_rap_app
nano .env.production
```

Contenu :

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

---

## 9. Deploy backend

```bash
cd /srv/apps/rap_app/app
bash deploy/deploy_backend.sh
```

Note : ce script installe `requirements-prod.txt`, pas les dependances de test.

```bash
sudo chown -R abd:www-data /srv/apps/rap_app
sudo find /srv/apps/rap_app -type d -exec chmod 755 {} \;
chmod 600 /srv/apps/rap_app/app/.env
```

---

## 10. Deploy frontend

```bash
cd /srv/apps/rap_app/app
bash deploy/deploy_frontend.sh
```

---

## 11. Installer Gunicorn

```bash
sudo cp /srv/apps/rap_app/app/deploy/gunicorn_rapapp.service /etc/systemd/system/gunicorn_rapapp.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn_rapapp
sudo systemctl start gunicorn_rapapp
sudo systemctl status gunicorn_rapapp
```

Logs :

```bash
journalctl -u gunicorn_rapapp -n 100 --no-pager
```

---

## 12. Installer Nginx

Premiere passe :

- copier la conf
- ne garder actif que le bloc HTTP si le certificat n'existe pas encore

```bash
sudo cp /srv/apps/rap_app/app/deploy/nginx_rap_app.conf /etc/nginx/sites-available/rap_app.conf
sudo ln -s /etc/nginx/sites-available/rap_app.conf /etc/nginx/sites-enabled/rap_app.conf
sudo nginx -t
sudo systemctl reload nginx
```

---

## 13. Activer HTTPS

```bash
sudo certbot --nginx -d rap.adserv.fr
sudo nginx -t
sudo systemctl reload nginx
```

Si tu avais commente le bloc HTTPS au debut :

- remets-le
- relance `sudo nginx -t`
- puis `sudo systemctl reload nginx`

---

## 14. Verifications

```bash
dig rap.adserv.fr +short
curl -I https://rap.adserv.fr
curl -I https://rap.adserv.fr/api/
sudo systemctl status gunicorn_rapapp
sudo systemctl status nginx
```

Si besoin :

```bash
journalctl -u gunicorn_rapapp -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

---

## 15. Redeploiement plus tard

```bash
cd /srv/apps/rap_app/app
git pull origin main
bash deploy/deploy_backend.sh
bash deploy/deploy_frontend.sh
sudo systemctl restart gunicorn_rapapp
sudo systemctl reload nginx
```
