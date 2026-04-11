# VPS Deploy Report

Date de deploiement : `2026-04-10`

Contexte :

- domaine : `rap.adserv.fr`
- VPS : `147.93.126.119`
- OS : `Ubuntu 24.04 LTS`
- utilisateur VPS (SSH / admin) : `abd`
- utilisateur applicatif (Gunicorn) : `abd`
- app root : `/srv/apps/rap_app/app`
- frontend public : `/var/www/rap_app_front` (proprietaire : `www-data`)

Important :

- ce fichier ne contient pas les secrets
- les mots de passe, `SECRET_KEY` et tokens ont ete renseignes directement sur le VPS

## Commandes executees sur le VPS

### 1. Verification initiale

```bash
ssh abd@147.93.126.119 'pwd && whoami && hostname && uname -a'
ssh abd@147.93.126.119 'ls -lah /srv && ls -lah /srv/apps && ls -lah /var/www || true'
ssh abd@147.93.126.119 'systemctl is-active nginx postgresql || true'
ssh abd@147.93.126.119 'systemctl is-enabled nginx postgresql || true'
ssh abd@147.93.126.119 'test -d /srv/apps/rap_app/app && echo APP_EXISTS || echo APP_MISSING'
```

### 2. Preparation des dossiers applicatifs

```bash
ssh abd@147.93.126.119 'mkdir -p /srv/apps/rap_app/shared/media /srv/apps/rap_app/logs'
sudo mkdir -p /var/www/rap_app_front
sudo chown -R www-data:www-data /var/www/rap_app_front
sudo chmod 755 /var/www/rap_app_front
```

Note : une mention anterieure `chown abd:abd` sur le front etait **incorrecte** pour une prod Nginx (le serveur lit les fichiers en `www-data`).

### 3. Recuperation du repo

```bash
ssh abd@147.93.126.119 'cd /srv/apps/rap_app && git clone -b main https://github.com/D-ABD/Rap_app_backend_V3.git app'
ssh abd@147.93.126.119 'cd /srv/apps/rap_app/app && git pull origin main'
```

### 4. Creation des fichiers d'environnement

Fichiers crees sur le VPS :

```bash
/srv/apps/rap_app/app/.env
/srv/apps/rap_app/app/frontend_rap_app/.env.production
```

Variables configurees :

- Django production : `DEBUG=False`
- PostgreSQL local : `DB_NAME=rap_app_backend`
- frontend : `VITE_API_BASE_URL=/api`
- logs : `LOG_DIR=/srv/apps/rap_app/logs`

### 5. PostgreSQL

Actions realisees :

```bash
sudo -u postgres psql -c 'CREATE USER "ABD" WITH PASSWORD ...'
sudo -u postgres createdb -O "ABD" rap_app_backend
sudo -u postgres psql -c 'GRANT ALL PRIVILEGES ON DATABASE rap_app_backend TO "ABD"'
```

Correctif applique apres erreur de permissions :

```bash
sudo -u postgres psql rap_app_backend
ALTER DATABASE rap_app_backend OWNER TO "ABD";
ALTER SCHEMA public OWNER TO "ABD";
GRANT ALL PRIVILEGES ON DATABASE rap_app_backend TO "ABD";
GRANT ALL PRIVILEGES ON SCHEMA public TO "ABD";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "ABD";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "ABD";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "ABD";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "ABD";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "ABD";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "ABD";
```

### 6. Deploiement backend

```bash
ssh abd@147.93.126.119 'cd /srv/apps/rap_app/app && RUN_DEPLOY_CHECK=true bash deploy/deploy_backend.sh'
```

Effets :

- creation du venv : `/srv/apps/rap_app/venv`
- installation des dependances Python prod
- execution des migrations
- `collectstatic`
- `manage.py check --deploy`

Migration appliquee pendant le deploiement :

- `rap_app.0054_alter_customuser_role_alter_suivijury_annee_and_more`

### 7. Deploiement frontend

```bash
ssh abd@147.93.126.119 'cd /srv/apps/rap_app/app && RUN_LINT=false WEB_OWNER=www-data WEB_GROUP=www-data bash deploy/deploy_frontend.sh'
```

Effets :

- `npm ci`
- `npm run build`
- copie du build vers `/var/www/rap_app_front`
- ownership final : `www-data:www-data`

### 8. Gunicorn et permissions applicatives
Etat retenu apres stabilisation :

- Gunicorn tourne sous **`abd`**
- le repo et l'arborescence applicative restent possedes par **`abd:abd`**
- le frontend public reste en **`www-data:www-data`**

Service systemd attendu :

```bash
grep -E '^User=|^Group=|^WorkingDirectory=|^EnvironmentFile=' /etc/systemd/system/gunicorn_rapapp.service
```

Attendu :

```text
User=abd
Group=www-data
WorkingDirectory=/srv/apps/rap_app/app
EnvironmentFile=/srv/apps/rap_app/app/.env
```

Verification rapide :

```bash
ls -ld /srv/apps/rap_app /srv/apps/rap_app/app
grep -E '^User=|^Group=' /etc/systemd/system/gunicorn_rapapp.service
systemctl status gunicorn_rapapp --no-pager
```

### 9. Certificat HTTPS

Verification :

```bash
sudo certbot certonly --standalone -d rap.adserv.fr --non-interactive --agree-tos -m adserv.fr@gmail.com
```

Resultat :

- certificat deja present
- aucune regeneration necessaire

### 10. Nginx

```bash
sudo cp /srv/apps/rap_app/app/deploy/nginx_rap_app.conf /etc/nginx/sites-available/rap_app.conf
sudo ln -sf /etc/nginx/sites-available/rap_app.conf /etc/nginx/sites-enabled/rap_app.conf
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### 11. Activation finale HTTPS stricte

```bash
SECURE_SSL_REDIRECT=True
sudo systemctl restart gunicorn_rapapp
```

### 12. Sauvegardes locales automatisees

Script installe :

```bash
/srv/apps/rap_app/app/deploy/backup_rap_app.sh
```

Arborescence creee :

```bash
/srv/backups/rap_app/db
/srv/backups/rap_app/media
```

Commande de test executee :

```bash
/srv/apps/rap_app/app/deploy/backup_rap_app.sh
```

Cron ajoute pour l'utilisateur `abd` :

```cron
15 2 * * * /srv/apps/rap_app/app/deploy/backup_rap_app.sh >> /srv/apps/rap_app/logs/backup.log 2>&1
```

Effets :

- dump PostgreSQL quotidien au format `pg_dump --format=custom`
- archive `tar.gz` quotidienne du dossier `media`
- retention locale de `7` jours

### 13. Monitoring cron installe

Scripts installes :

```bash
/srv/apps/rap_app/app/deploy/monitor_http_user.sh
/srv/apps/rap_app/app/deploy/monitor_services_user.sh
/usr/local/bin/monitor_system_root.sh
```

Verifications manuelles executees avec succes :

```bash
/srv/apps/rap_app/app/deploy/monitor_http_user.sh
/srv/apps/rap_app/app/deploy/monitor_services_user.sh
sudo /usr/local/bin/monitor_system_root.sh
```

Crontab `abd` :

```cron
*/30 * * * * /srv/apps/rap_app/app/deploy/monitor_http_user.sh >> /srv/apps/rap_app/logs/monitor_http_user.log 2>&1
*/30 * * * * /srv/apps/rap_app/app/deploy/monitor_services_user.sh >> /srv/apps/rap_app/logs/monitor_services_user.log 2>&1
```

Crontab `root` :

```cron
*/10 * * * * /usr/local/bin/monitor_system_root.sh >> /srv/apps/rap_app/logs/monitor_system_root.log 2>&1
```

Perimetre :

- monitoring HTTP du frontend (`200`) et de l'API (`401`)
- verification des services `gunicorn_rapapp`, `nginx`, `postgresql`
- verification de la presence du front build et des repertoires critiques
- verification de la fraicheur des sauvegardes locales
- verification systeme root : `ssh`, `fail2ban`, `ufw`, disque et inodes

### 14. Emails automatiques

Scripts installes :

```bash
/srv/apps/rap_app/app/deploy/send_email_via_django.sh
/srv/apps/rap_app/app/deploy/send_deploy_notification.sh
/srv/apps/rap_app/app/deploy/send_daily_report.sh
```

Tests reels executes avec succes :

```bash
/srv/apps/rap_app/app/deploy/send_daily_report.sh
/srv/apps/rap_app/app/deploy/send_deploy_notification.sh manual-test
```

Resultat :

- un email de rapport quotidien a ete envoye
- un email de notification de deploiement a ete envoye
- destinataire de test : `adserv.fr@gmail.com`

Cron ajoute pour l'utilisateur `abd` :

```cron
0 7 * * * /srv/apps/rap_app/app/deploy/send_daily_report.sh >> /srv/apps/rap_app/logs/daily_report.log 2>&1
```

Comportement retenu :

- `deploy/deploy_backend.sh` envoie un email de notification en fin de deploiement backend
- `deploy/deploy_frontend.sh` envoie un email de notification en fin de deploiement frontend
- les scripts de monitoring locaux peuvent envoyer un email si une verification echoue alors que le VPS est encore joignable

Limite importante :

- si le VPS entier tombe ou devient totalement inaccessible, **aucun script local ne peut envoyer d'email**
- pour un vrai alerting "serveur down", il faut ajouter une supervision **externe** hors VPS

### 15. Monitoring externe cree

Monitors crees :

- `https://rap.adserv.fr`
- `https://rap.adserv.fr/health/`

Usage retenu :

- `https://rap.adserv.fr` verifie que le frontend public repond
- `https://rap.adserv.fr/health/` verifie rapidement la sante applicative avec un `200`

## Problemes rencontres et corrections

### 1. Permissions PostgreSQL insuffisantes

Symptome :

- `permission denied for table django_migrations`

Correction :

- changement d'owner DB/schema
- grants complets tables / sequences / functions
- default privileges pour les futurs objets

### 2. Build frontend casse sur Linux

Symptome :

- `Cannot find module 'src/pages/logs/LogsPage'`

Cause :

- le dossier `frontend_rap_app/src/pages/logs/` existait localement mais etait ignore par Git a cause de la regle `.gitignore` : `logs/`

Correction :

- ajout d'exceptions Git pour `frontend_rap_app/src/pages/logs/*.tsx`
- commit/push des fichiers :
  - `LogsPage.tsx`
  - `LogTable.tsx`
  - `LogDetailModal.tsx`

### 3. Lint dans le script frontend

Symptome :

- `eslint: not found` sur clone neuf avant `npm ci`

Correction :

- execution du deploiement frontend avec `RUN_LINT=false` sur le VPS
- lint conserve comme verification locale avant push

### 4. Permissions cassees sur `/srv/apps/rap_app`

Symptome :

- `cd /srv/apps/rap_app/app` echoue avec `Permission denied`
- `git pull` echoue
- `cat deploy/gunicorn_rapapp.service` echoue

Cause :

- les permissions de `/srv/apps/rap_app` avaient ete modifiees de facon trop restrictive
- l'utilisateur `abd` ne pouvait plus traverser l'arborescence

Correction appliquee :

```bash
sudo chown -R abd:abd /srv/apps/rap_app
sudo find /srv/apps/rap_app -type d -exec chmod 755 {} \;
sudo systemctl restart gunicorn_rapapp
```

Mesure preventive retenue :

- suppression de la bascule automatique de proprietaire dans `deploy/deploy_backend.sh`
- alignement de `deploy/gunicorn_rapapp.service` sur l'etat reel stable : `User=abd`, `Group=www-data`

## Etat final du VPS

### Services

- `postgresql` : `active`
- `gunicorn_rapapp` : `active`
- `nginx` : `active`
- `fail2ban` : `active`
- `ssh` : `active`

### HTTP / HTTPS

- `https://rap.adserv.fr` : `200 OK`
- `https://rap.adserv.fr/api/` : `401 Unauthorized`

Le `401` sur `/api/` est normal : cela prouve que le backend repond derriere Nginx.

### Arborescence finale

```text
/srv/apps/rap_app/
├── app
├── venv
├── logs
└── shared/
    └── media

/var/www/rap_app_front/
├── index.html
├── assets/
└── vite.svg
```

### Dossiers et proprietaires

- `/srv/apps/rap_app` : `abd:abd`
- `/srv/apps/rap_app/app` : `abd:abd`
- `/srv/apps/rap_app/venv` : `abd:abd`
- `/srv/apps/rap_app/logs` : `abd:abd`
- `/srv/apps/rap_app/shared/media` : `abd:abd`
- `/srv/backups/rap_app` : `abd:abd`
- `/var/www/rap_app_front` : `www-data:www-data`
- `/usr/local/bin/monitor_system_root.sh` : `root:root`

### Ports et exposition reseau

Ports exposes via UFW :

- `22/tcp` : SSH
- `80/tcp` : HTTP
- `443/tcp` : HTTPS

Ports internes utiles :

- `127.0.0.1:8000` : Gunicorn
- `5432` : PostgreSQL local

### Configuration finale

- `SECURE_SSL_REDIRECT=True`
- frontend et backend sur le meme domaine
- frontend servi par Nginx
- backend servi par Gunicorn sur `127.0.0.1:8000`
- Gunicorn execute sous `abd` avec `Group=www-data`
- repo applicatif et venv sous `abd:abd`
- Nginx proxy `/api/` et `/admin/`
- static : `/srv/apps/rap_app/app/staticfiles`
- media : `/srv/apps/rap_app/shared/media`
- logs applicatifs : `/srv/apps/rap_app/logs`
- sauvegardes locales : `/srv/backups/rap_app/db` et `/srv/backups/rap_app/media`

## Verifications finales utiles

```bash
curl -Ik https://rap.adserv.fr
curl -Ik https://rap.adserv.fr/api/
ls -lah /srv/backups/rap_app/db
ls -lah /srv/backups/rap_app/media
crontab -l
sudo crontab -l
/srv/apps/rap_app/app/deploy/send_daily_report.sh
sudo systemctl status fail2ban
sudo fail2ban-client status sshd
sudo systemctl status gunicorn_rapapp
sudo systemctl status nginx
```

## Suite recommandee

- changer les mots de passe temporaires si necessaire
- verifier l'acces `/admin/`
- tester login frontend
- tester upload media
- traiter ensuite :
  - warning `drf_spectacular`
  - taille du bundle frontend
  - `npm audit`

## Securite VPS — UFW, Fail2ban, PostgreSQL (priorite)

Mise a jour : `2026-04-10`

### Limitation (automatisation)

Les verifications ci-dessous necessitent `sudo` avec mot de passe. Une session SSH **non interactive** (agent / scripts) **ne peut pas** executer `sudo ufw` ni `apt install` sans configuration `NOPASSWD` dediee. A executer **dans ta session SSH interactive** sur le VPS.

### 1. Pare-feu UFW — etat attendu

Ports ouverts vers Internet :

- `22/tcp` — SSH
- `80/tcp` — HTTP
- `443/tcp` — HTTPS

Commandes :

```bash
sudo ufw status verbose
```

Si UFW est inactif ou incomplet, exemple de configuration minimale (a adapter si tu utilises d'autres services) :

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Etat confirme sur le VPS :

- `UFW` actif
- politique : `deny (incoming)` / `allow (outgoing)`
- SSH ouvert via `OpenSSH`
- HTTP/HTTPS ouverts via `Nginx Full`

Note :

- il reste des regles explicites `80/tcp` et `443/tcp` en doublon du profil `Nginx Full`
- c'est inoffensif ; nettoyage optionnel plus tard avec `sudo ufw status numbered`

### 2. Fail2ban (recommande si SSH expose sur Internet)

Etat constate sur le VPS :

- paquet deja installe
- service `enabled`
- service `active`
- jail `sshd` active

Verification rapide :

```bash
sudo systemctl status fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Configuration locale minimale ajoutee le `2026-04-11` :

```bash
/etc/fail2ban/jail.local
```

Contenu :

```ini
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
```

Etat observe apres redemarrage :

- `fail2ban` actif
- jail `sshd` active
- bans SSH deja en cours sur plusieurs IP

### 3. Utilisateur PostgreSQL `"ABD"` vs `abd`

Constat historique dans ce rapport : creation d'un role PostgreSQL nomme `"ABD"` (guillemets obligatoires a cause des majuscules). Ce n'est **pas bloquant** tant que tout tourne, mais c'est une **mauvaise pratique** : les majuscules imposent des identifiants quotes partout et compliquent scripts et maintenance.

Recommandation :

- **court terme** : laisser tel quel si la prod tourne.
- **plus tard** : migrer vers un role en minuscules sans quotes, par ex. `abd`, en planifiant renommage ou nouveau role + `GRANT` + mise a jour `DB_USER` dans `.env`.

### 4. Resultats constates sur le VPS (`2026-04-10`)

**UFW** — active au demarrage, politique `deny (incoming)` / `allow (outgoing)`, journalisation `low`.

Regles entrantes (IPv4 + IPv6) :

- `22/tcp` — profil **OpenSSH** — `ALLOW IN Anywhere`
- `80,443/tcp` — profil **Nginx Full** — `ALLOW IN Anywhere`
- `80/tcp` et `443/tcp` — regles supplementaires explicites (doublon fonctionnel avec *Nginx Full* ; inoffensif, nettoyage optionnel via `sudo ufw status numbered` puis `delete`)

**Fail2ban** — paquet deja present (`1.0.2-3ubuntu0.1`), service **enabled** et **active (running)**. La jail `sshd` est active. Une configuration explicite minimale a ete posee dans `/etc/fail2ban/jail.local` le `2026-04-11`.

Pour lister les jails actives si besoin :

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### 5. SSH durci explicitement (`2026-04-11`)

Etat confirme :

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`

Un conflit de lecture potentiel existait dans les fragments `sshd_config.d` :

- `50-cloud-init.conf` contenait encore `PasswordAuthentication yes`
- `60-cloudimg-settings.conf` contenait deja `PasswordAuthentication no`

Pour supprimer toute ambiguite, un override explicite a ete ajoute :

```bash
/etc/ssh/sshd_config.d/99-hardening.conf
```

Contenu :

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Verification :

```bash
sudo sshd -t
sudo systemctl reload ssh
sudo grep -E '^(PermitRootLogin|PasswordAuthentication|PubkeyAuthentication)' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf
```

## Choix d'exploitation retenu

Le serveur tourne maintenant de facon stable avec cette convention :

- code, venv, logs, media et repo sous **`abd:abd`**
- Gunicorn execute sous **`abd`**
- groupe systemd Gunicorn : **`www-data`**
- frontend public sous **`www-data:www-data`**

Important :

- `deploy/deploy_backend.sh` ne doit plus modifier le proprietaire du repo
- `deploy/gunicorn_rapapp.service` doit rester coherent avec l'etat reel du VPS

Verification rapide :

```bash
ls -ld /srv/apps/rap_app /srv/apps/rap_app/app /var/www/rap_app_front
grep -E '^User=|^Group=' /etc/systemd/system/gunicorn_rapapp.service
systemctl status gunicorn_rapapp nginx --no-pager
```

## Points de securite restants

- **Backups hors VPS** : les sauvegardes sont maintenant automatisees localement, mais pas encore externalisees hors du meme disque/VPS
- **Monitoring applicatif** : le monitoring local et un monitoring externe de base sont en place ; il reste a verifier la qualite des alertes, les destinataires et l'escalade si besoin
- **Monitoring erreurs** : pas encore de Sentry backend/frontend documente comme actif
- **Nettoyage UFW** : doublons `80/tcp` et `443/tcp` encore presents en plus de `Nginx Full`
- **PostgreSQL** : role `"ABD"` fonctionnel mais non ideal a long terme
- **Rotation/centralisation logs** : pas encore formalisees ici pour les logs applicatifs Django

## Risques residuels

- **Risque moyen** : les sauvegardes existent, mais restent sur le meme VPS ; en cas de perte du disque ou compromission serveur, elles peuvent etre perdues aussi
- **Risque faible** : doublons UFW sans impact fonctionnel, mais lisibilite moindre
- **Risque faible** : le monitoring externe de base existe, mais il faut encore confirmer les alertes email, les seuils et la procedure de reaction
- **Risque faible** : role PostgreSQL en majuscules peut compliquer la maintenance future
- **Risque operationnel** : un futur `git pull` suivi d'un redeploiement avec des scripts locaux non pushes peut reintroduire un ecart entre repo et VPS

## Reste a faire (priorise)

| Priorite | Action |
|----------|--------|
| Haute | **Verifier la prod** : `curl -Ik https://rap.adserv.fr`, login app, `/admin/`, fichiers static/media. Commandes : `systemctl status gunicorn_rapapp nginx --no-pager`, `grep -E '^User=|^Group=' /etc/systemd/system/gunicorn_rapapp.service` (attendu : `abd` / `www-data`). |
| Haute | **Pousser les correctifs locaux** : `deploy/deploy_backend.sh`, `deploy/gunicorn_rapapp.service` et ce rapport, pour garder le repo aligne sur l'etat stable du VPS. |
| Moyenne | **Externaliser les sauvegardes** : copier `/srv/backups/rap_app` vers un stockage hors VPS (S3, autre machine, snapshot hebergeur, etc.). |
| Moyenne | **Valider le monitoring externe** : verifier les emails d'alerte, les contacts, la frequence de check et la procedure de reaction. |
| Basse | **PostgreSQL** : migrer le role `"ABD"` vers `abd` (minuscules) quand tu auras une fenetre de maintenance. |
| Basse | **UFW** : supprimer les regles en double (80/443 vs *Nginx Full*) avec `sudo ufw status numbered` / `delete` si tu veux un affichage plus propre. |

## Checklist finale

- [x] Domaine `rap.adserv.fr` pointe vers le VPS
- [x] HTTPS actif sur `rap.adserv.fr`
- [x] `nginx` actif
- [x] `gunicorn_rapapp` actif
- [x] `postgresql` actif
- [x] `fail2ban` actif
- [x] SSH durci : root interdit, mot de passe desactive, cle publique active
- [x] UFW actif avec SSH, HTTP et HTTPS ouverts
- [x] Frontend servi depuis `/var/www/rap_app_front`
- [x] Backend accessible derriere Nginx sur `/api/`
- [x] Static et media routes vers les bons dossiers
- [x] Repo, venv, logs et media alignes sur l'arborescence `/srv/apps/rap_app`
- [x] Backups automatiques locaux formalises
- [x] Monitoring cron local formalise
- [x] Emails automatiques de rapport et de deploiement formalises
- [x] Monitoring externe de base formalise
- [ ] Sauvegardes externalisees hors VPS
- [ ] Nettoyage optionnel des regles UFW en doublon
- [ ] Migration optionnelle du role PostgreSQL `"ABD"` vers `abd`
