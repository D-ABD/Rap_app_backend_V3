# Deploy

Plan de deploiement priorise pour une VPS Ubuntu neuve.

Contexte :

- backend Django
- frontend Vite
- PostgreSQL
- mails via Google SMTP
- front et back sur la meme machine

Parametres retenus :

- domaine : `rap.adserv.fr`
- `www` : non
- meme domaine front/back : oui
- email applicatif : `adserv.fr@gmail.com`
- PostgreSQL local : oui
- `DB_NAME` : `rap_app_backend`
- `DB_USER` : `abd`
- utilisateur VPS : `abd`
- repo git : `https://github.com/D-ABD/Rap_app_backend_V3.git`
- branche : `main`

Parametres de cette VPS :

- OS : `Ubuntu 24.04 LTS`
- hostname : `srv781699.hstgr.cloud`
- IP publique : `147.93.126.119`
- acces initial : `ssh root@147.93.126.119`
- localisation : `Germany - Frankfurt`
- ressources : `1 vCPU`, `4 GB RAM`, `50 GB disque`

Ne pas stocker ici :

- mot de passe root
- secrets
- contenu du `.env`
- mots de passe SMTP
- cles SSH privees

Reference active :

- [deploy/deploy_backend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_backend.sh)
- [deploy/deploy_frontend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_frontend.sh)
- [deploy/gunicorn_rapapp.service](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/gunicorn_rapapp.service)
- [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf)
- [deploy/prod.env.checklist.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/prod.env.checklist.md)

Archives :

- [old_deploy/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/old_deploy)

Fichiers applicatifs a garder et reconfigurer :

- [rap_app_project/settings.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app_project/settings.py)
- [.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/.env.example)
- [frontend_rap_app/.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/.env.example)
- [frontend_rap_app/vite.config.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/vite.config.ts)
- [frontend_rap_app/src/config/env.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/config/env.ts)
- [frontend_rap_app/src/api/axios.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/api/axios.ts)

Architecture cible :

- code : `/srv/rap_app/app`
- venv : `/srv/rap_app/venv`
- media : `/srv/rap_app/shared/media`
- logs : `/srv/rap_app/logs`
- front build : `/var/www/rap_app_front`
- Gunicorn : `127.0.0.1:8000`
- Nginx : frontend + `/api/` + `/admin/` + `/static/` + `/media/`

Pieges critiques a verifier :

- Gunicorn doit binder `127.0.0.1:8000` dans [deploy/gunicorn_rapapp.service](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/gunicorn_rapapp.service)
- Nginx doit proxyfier `/api/` et `/admin/` vers `http://127.0.0.1:8000` dans [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf)
- Gunicorn doit charger `EnvironmentFile=/srv/rap_app/app/.env`
- le fichier `.env` doit rester dans `/srv/rap_app/app/.env`
- `SECURE_SSL_REDIRECT=False` pendant l'installation initiale, puis `True` apres HTTPS valide
- le DNS `rap.adserv.fr` doit pointer vers `147.93.126.119`

---

## 1. Priorite 1 : obligatoire avant mise en ligne

### 1.A Execution pas a pas

Ordre exact a suivre sur la VPS.

1. Connexion :

```bash
ssh abd@147.93.126.119
```

2. Paquets systeme :

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

3. Firewall :

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

4. Arborescence :

```bash
sudo mkdir -p /srv/rap_app/shared/media
sudo mkdir -p /srv/rap_app/logs
sudo mkdir -p /var/www/rap_app_front
sudo chown -R abd:abd /srv/rap_app
sudo chown -R abd:abd /var/www/rap_app_front
```

Permissions de base :

```bash
sudo find /srv/rap_app -type d -exec chmod 755 {} \;
```

5. Repo :

```bash
cd /srv/rap_app
git clone -b main https://github.com/D-ABD/Rap_app_backend_V3.git app
cd /srv/rap_app/app
```

6. PostgreSQL :

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

7. `.env` backend :

```bash
cd /srv/rap_app/app
cp deploy/prod.env.example .env
nano .env
chmod 600 .env
```

Remplacer dans `.env` :

- `SECRET_KEY`
- `DB_PASSWORD`
- `EMAIL_HOST_PASSWORD`

8. `.env.production` frontend :

```bash
cd /srv/rap_app/app/frontend_rap_app
nano .env.production
```

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

9. Backend :

```bash
cd /srv/rap_app/app
bash deploy/deploy_backend.sh
```

Apres le backend :

```bash
sudo chown -R abd:www-data /srv/rap_app
sudo find /srv/rap_app -type d -exec chmod 755 {} \;
chmod 600 /srv/rap_app/app/.env
```

10. Frontend :

```bash
cd /srv/rap_app/app
bash deploy/deploy_frontend.sh
```

11. Gunicorn :

```bash
sudo cp /srv/rap_app/app/deploy/gunicorn_rapapp.service /etc/systemd/system/gunicorn_rapapp.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn_rapapp
sudo systemctl start gunicorn_rapapp
sudo systemctl status gunicorn_rapapp
```

12. Nginx, premiere passe HTTP :

```bash
sudo cp /srv/rap_app/app/deploy/nginx_rap_app.conf /etc/nginx/sites-available/rap_app.conf
sudo ln -s /etc/nginx/sites-available/rap_app.conf /etc/nginx/sites-enabled/rap_app.conf
```

Si le certificat n'existe pas encore :

- commenter temporairement le bloc `server { listen 443 ssl ... }`
- garder seulement le bloc HTTP actif

Puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

13. HTTPS :

```bash
sudo certbot --nginx -d rap.adserv.fr
```

Si tu avais commente le bloc HTTPS :

- le remettre

Puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

14. Verification :

```bash
dig rap.adserv.fr +short
curl -I https://rap.adserv.fr
curl -I https://rap.adserv.fr/api/
sudo systemctl status gunicorn_rapapp
sudo systemctl status nginx
```

15. Si probleme :

```bash
journalctl -u gunicorn_rapapp -n 100 --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

### 1.0 Securiser l'acces SSH

A faire des le debut :

- creer ou verifier une cle SSH sur ton Mac
- creer un utilisateur non-root sur le VPS, par exemple `abd`
- ajouter ta cle publique dans `authorized_keys`
- desactiver ensuite la connexion root et l'authentification par mot de passe

Cote Mac :

```bash
ls -lah ~/.ssh
ssh-keygen -t ed25519 -C "macbook-abd"
cat ~/.ssh/id_ed25519.pub
```

Cote VPS :

```bash
id abd || adduser abd
usermod -aG sudo abd
mkdir -p /home/abd/.ssh
nano /home/abd/.ssh/authorized_keys
chmod 700 /home/abd/.ssh
chmod 600 /home/abd/.ssh/authorized_keys
chown -R abd:abd /home/abd/.ssh
```

Dans `/etc/ssh/sshd_config`, verifier au minimum :

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
```

Puis :

```bash
systemctl restart ssh
ssh abd@147.93.126.119
```

Regle utile :

- si tu changes d'ordinateur plus tard, tu ne refais pas le VPS
- tu crees juste une nouvelle cle sur le nouveau poste
- puis tu ajoutes sa cle publique dans `authorized_keys`

### 1.1 Preparer la VPS

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

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.2 Creer l'arborescence

```bash
sudo mkdir -p /srv/rap_app/shared/media
sudo mkdir -p /srv/rap_app/logs
sudo mkdir -p /var/www/rap_app_front
sudo chown -R abd:abd /srv/rap_app
sudo chown -R abd:abd /var/www/rap_app_front

cd /srv/rap_app
git clone -b main https://github.com/D-ABD/Rap_app_backend_V3.git app
```

### 1.3 Creer PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE rap_app_backend;
CREATE USER abd WITH PASSWORD 'change_me';
ALTER ROLE abd SET client_encoding TO 'utf8';
ALTER ROLE abd SET default_transaction_isolation TO 'read committed';
ALTER ROLE abd SET timezone TO 'Europe/Paris';
GRANT ALL PRIVILEGES ON DATABASE rap_app_backend TO abd;
\q
```

### 1.4 Creer le `.env` prod

Depuis `/srv/rap_app/app` :

```bash
cp deploy/prod.env.example .env
nano .env
chmod 600 .env
```

Contenu attendu :

```env
DEBUG=False
SECRET_KEY=une_vraie_cle_longue_et_aleatoire
ALLOWED_HOSTS=rap.adserv.fr,147.93.126.119
CSRF_TRUSTED_ORIGINS=https://rap.adserv.fr,http://rap.adserv.fr
CORS_ALLOWED_ORIGINS=https://rap.adserv.fr

DB_NAME=rap_app_backend
DB_USER=abd
DB_PASSWORD=change_me
DB_HOST=127.0.0.1
DB_PORT=5432

STATIC_ROOT=/srv/rap_app/app/staticfiles
MEDIA_ROOT=/srv/rap_app/shared/media

SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY=same-origin
SECURE_CROSS_ORIGIN_OPENER_POLICY=same-origin
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=adserv.fr@gmail.com
EMAIL_HOST_PASSWORD=mot_de_passe_application_google
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=RAP_APP <adserv.fr@gmail.com>
SERVER_EMAIL=adserv.fr@gmail.com
```

Note rapide :

- garder l'IP dans `ALLOWED_HOSTS` peut aider en fallback ou pour certains tests directs
- garder temporairement `http://rap.adserv.fr` dans `CSRF_TRUSTED_ORIGINS` peut etre pratique pendant l'installation HTTPS et le debug initial
- pendant l'installation initiale, garder `SECURE_SSL_REDIRECT=False`
- une fois le certificat Let’s Encrypt actif et Nginx en HTTPS valide, repasser `SECURE_SSL_REDIRECT=True`

Reference :

- [deploy/prod.env.checklist.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/prod.env.checklist.md)
- [deploy/prod.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/prod.env.example)

### 1.5 Corriger la config applicative

Verifier dans [rap_app_project/settings.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app_project/settings.py) :

- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `SECURE_PROXY_SSL_HEADER`
- `STATIC_ROOT`
- `MEDIA_ROOT`

Obligatoire :

- remplacer les domaines historiques dans `CSRF_TRUSTED_ORIGINS` et `CORS_ALLOWED_ORIGINS`
- aligner `MEDIA_ROOT` avec `/srv/rap_app/shared/media`

### 1.6 Deployer le backend

```bash
cd /srv/rap_app/app
bash deploy/deploy_backend.sh
```

Ce script :

- cree le venv
- installe les dependances Python
- lance les migrations
- lance `collectstatic`
- lance `manage.py check --deploy`

### 1.7 Deployer le frontend

Si besoin :

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

Puis :

```bash
cd /srv/rap_app/app
bash deploy/deploy_frontend.sh
```

### 1.8 Installer Gunicorn

```bash
sudo cp /srv/rap_app/app/deploy/gunicorn_rapapp.service /etc/systemd/system/gunicorn_rapapp.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn_rapapp
sudo systemctl start gunicorn_rapapp
sudo systemctl status gunicorn_rapapp
```

Logs :

```bash
journalctl -u gunicorn_rapapp -n 100 --no-pager
```

### 1.9 Installer Nginx

Premiere etape : installer une conf HTTP simple.

```bash
sudo cp /srv/rap_app/app/deploy/nginx_rap_app.conf /etc/nginx/sites-available/rap_app.conf
sudo ln -s /etc/nginx/sites-available/rap_app.conf /etc/nginx/sites-enabled/rap_app.conf
```

A ce stade, la partie HTTPS de [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf) depend encore des certificats Let’s Encrypt. Donc :

- soit tu commentes temporairement le bloc `server { listen 443 ssl ... }`
- soit tu n'actives d'abord que le bloc HTTP

Puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 1.10 Activer HTTPS

```bash
sudo certbot --nginx -d rap.adserv.fr
sudo nginx -t
sudo systemctl reload nginx
```

Une fois le certificat genere :

- remettre le bloc HTTPS complet si tu l'avais commente
- verifier dans [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf) :
  - `server_name`
  - chemins SSL
  - `alias /media/` si tu changes `MEDIA_ROOT`

Puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Ensuite, remettre dans `.env` :

```env
SECURE_SSL_REDIRECT=True
```

Puis recharger Gunicorn :

```bash
sudo systemctl restart gunicorn_rapapp
```

### 1.11 Ajouter un healthcheck

Minimum :

- endpoint `/health/`
- reponse `200`

### 1.12 Mettre les backups en place

Minimum avant vraie prod :

- backup quotidien PostgreSQL
- backup media
- copie du `.env` en lieu sur

Important :

- ne pas stocker les backups seulement sur le meme disque

### 1.13 Tester la prod

Checklist :

1. frontend OK
2. reload d'une route frontend OK
3. `/api/` OK
4. `/admin/` OK
5. login OK
6. CRUD simple OK
7. upload media OK
8. media servi OK
9. static OK
10. `check --deploy` OK ou compris

Commandes utiles :

```bash
curl -I https://rap.adserv.fr
curl -I https://rap.adserv.fr/api/
sudo systemctl status gunicorn_rapapp
sudo systemctl status nginx
```

---

## 2. Priorite 2 : tres recommande juste apres

### 2.1 Google SMTP

Configurer Django avec Google :

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=adserv.fr@gmail.com
EMAIL_HOST_PASSWORD=mot_de_passe_application_google
EMAIL_USE_TLS=True
```

Optionnel mais utile :

- `DEFAULT_FROM_EMAIL`
- `SERVER_EMAIL`
- `ADMINS`

Faire un test d'envoi reel.

### 2.2 Monitoring uptime

Choisir un service :

- Better Uptime
- UptimeRobot
- Uptime Kuma

Minimum :

- surveiller le domaine public
- surveiller `/health/`
- recevoir une alerte mail

### 2.3 Logs et rotation

Mettre en place :

- `journalctl` pour Gunicorn
- `logrotate` pour Nginx
- verifier la rotation des logs applicatifs

### 2.4 Securite simple

Faire rapidement :

- SSH par cles
- desactiver le mot de passe SSH si possible
- installer `fail2ban`

### 2.5 Cron minimum

Mettre au moins :

- `python manage.py clearsessions`
- backup DB
- backup media

---

## 3. Priorite 3 : utile ensuite

### 3.1 Monitoring des cron jobs

Recommande :

- Healthchecks.io

Pour :

- backup DB
- backup media
- `clearsessions`

### 3.2 Sentry

A ajouter pour :

- erreurs backend
- erreurs frontend
- suivi de release

### 3.3 Notifications de deploy

Possible via :

- email
- Telegram
- Slack

### 3.4 Endpoint version

Ajouter :

- `/version/`

ou inclure la release dans `/health/`.

### 3.5 Test de restauration

Faire au moins un restore test :

- DB
- media

---

## 4. Priorite 4 : plus avance

### 4.1 Monitoring infra

Options :

- Netdata
- Prometheus + Grafana

### 4.2 Recherche centralisee dans les logs

Options :

- Loki + Grafana
- ELK

### 4.3 Taches asynchrones

Si besoin plus tard :

- Celery + Redis
- ou RQ

### 4.4 CI/CD et rollback

Plus tard :

- tests auto
- deploy auto
- rollback par releases

### 4.5 Durcissement supplementaire

Plus tard :

- `unattended-upgrades`
- audit securite dependances
- rate limiting login

---

## 5. Pack recommande 80/20

Ordre concret :

1. Ubuntu + paquets
2. PostgreSQL
3. `.env` prod
4. correction `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, `MEDIA_ROOT`
5. backend
6. frontend
7. Gunicorn
8. Nginx
9. HTTPS
10. healthcheck
11. backups DB + media
12. Google SMTP
13. monitoring uptime
14. `fail2ban`
15. cron `clearsessions`
16. monitoring cron
17. Sentry

---

## 6. Definition de "prod prete"

Je considere la prod prete quand :

1. domaine OK
2. HTTPS OK
3. `DEBUG=False`
4. PostgreSQL OK
5. Gunicorn OK
6. Nginx OK
7. static OK
8. media OK
9. mails OK si necessaires
10. healthcheck OK
11. backups OK
12. monitoring uptime OK
