# VPS Deploy Report

Date de deploiement : `2026-04-10`

Contexte :

- domaine : `rap.adserv.fr`
- VPS : `147.93.126.119`
- OS : `Ubuntu 24.04 LTS`
- utilisateur VPS (SSH / admin) : `abd`
- utilisateur applicatif (Gunicorn, fichiers sous `/srv/apps/rap_app`) : `rapapp`
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

### 8. Gunicorn et isolation `rapapp`

L'unite systemd doit executer Gunicorn sous l'utilisateur systeme **`rapapp`** (pas `abd`), avec fichiers applicatifs possedes par **`rapapp`**. Le script `deploy/vps_setup_rapapp_user.sh` installe l'unite, cree l'utilisateur, ajuste les droits et ajoute **`www-data` au groupe `rapapp`** pour que Nginx puisse lire `staticfiles/` et `shared/media/` (groupe en lecture).

Sur le VPS (session SSH **avec sudo** / mot de passe) :

```bash
cd /srv/apps/rap_app/app
sudo bash deploy/vps_setup_rapapp_user.sh deploy/gunicorn_rapapp.service
```

Sans depot encore clone : copier `deploy/vps_setup_rapapp_user.sh` et `deploy/gunicorn_rapapp.service` sur le serveur, puis :

```bash
sudo bash vps_setup_rapapp_user.sh /chemin/vers/gunicorn_rapapp.service
```

Apres un `deploy_backend.sh` en tant que `abd`, le script backend reapplique `chown rapapp:rapapp` sur `/srv/apps/rap_app` si l'utilisateur `rapapp` existe.

Verification rapide :

```bash
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

## Etat final du VPS

### Services

- `postgresql` : `active`
- `gunicorn_rapapp` : `active`
- `nginx` : `active`

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

### Configuration finale

- `SECURE_SSL_REDIRECT=True`
- frontend et backend sur le meme domaine
- frontend servi par Nginx
- backend servi par Gunicorn sur `127.0.0.1:8000`
- Nginx proxy `/api/` et `/admin/`
- static : `/srv/apps/rap_app/app/staticfiles`
- media : `/srv/apps/rap_app/shared/media`
- logs applicatifs : `/srv/apps/rap_app/logs`

## Verifications finales utiles

```bash
curl -Ik https://rap.adserv.fr
curl -Ik https://rap.adserv.fr/api/
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

### 2. Fail2ban (recommande si SSH expose sur Internet)

Installation et demarrage :

```bash
sudo apt update
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo systemctl status fail2ban
```

Verification rapide :

```bash
sudo fail2ban-client status
```

Option : une jail `sshd` est en general activee par les paquets par defaut sur Ubuntu ; ajuster les fichiers sous `/etc/fail2ban/` si besoin.

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

**Fail2ban** — paquet deja present (`1.0.2-3ubuntu0.1`), service **enabled** et **active (running)** (depuis le `2026-04-09`). Aucune mise a niveau paquet lors du `apt install`.

Pour lister les jails actives si besoin :

```bash
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

## Isolation applicative `rapapp` — etat

### Execution sur le VPS (`2026-04-10`) — **terminee**

Depot : `https://github.com/D-ABD/Rap_app_backend_V3` (branche `main`, pull incluant `deploy/vps_setup_rapapp_user.sh`).

Commande executee sur `srv781699` :

```bash
cd /srv/apps/rap_app/app
sudo bash deploy/vps_setup_rapapp_user.sh deploy/gunicorn_rapapp.service
```

Resultat constate :

- groupe et utilisateur systeme **`rapapp`** crees
- **`www-data`** ajoute au groupe **`rapapp`**
- proprietaire **`rapapp:rapapp`** sur `/srv/apps/rap_app`, droits ajustes (`o=` puis `g+rX` dans le script)
- **`/var/www/rap_app_front`** en **`www-data:www-data`**
- unite systemd installee depuis **`deploy/gunicorn_rapapp.service`**
- **`gunicorn_rapapp` redemarre** avec succes

Note : un agent distant ne peut toujours pas lancer `sudo` sans mot de passe ; ici l'action a ete faite **en session SSH interactive**.

### Fichiers dans le depot (reference)

| Fichier | Role |
|--------|------|
| `deploy/gunicorn_rapapp.service` | `User=rapapp` `Group=rapapp` |
| `deploy/vps_setup_rapapp_user.sh` | Idempotent : utilisateur/groupe, droits, Nginx via groupe `rapapp`, unite systemd, redemarrage conditionnel |
| `deploy/deploy_backend.sh` | Si `rapapp` existe : `chown`, `o=` + `g+rX`, `.env` en `600` — **a pousser sur le meme remote que le VPS si ce fichier n’y est pas encore** |

### A relancer apres reinstall serveur / clone neuf

```bash
cd /srv/apps/rap_app/app && git pull
sudo bash deploy/vps_setup_rapapp_user.sh deploy/gunicorn_rapapp.service
```

### Rappel securite (nuance)

Passer sous `rapapp` **reduit fortement** l'impact d'un compromis applicatif (fichiers perso de `abd`, clés SSH dans `~/.ssh`, etc.). Cela **ne supprime pas** tout risque sur la machine (le processus reste du code avec acces reseau et a la configuration presente dans `.env`).

## Reste a faire (priorise)

| Priorite | Action |
|----------|--------|
| Haute | **Verifier la prod** : `curl -Ik https://rap.adserv.fr`, login app, `/admin/`, fichiers static/media. Commandes : `systemctl status gunicorn_rapapp nginx --no-pager`, `grep -E '^User=|^Group=' /etc/systemd/system/gunicorn_rapapp.service` (attendu : `rapapp`). |
| Haute | S’assurer que **`deploy/deploy_backend.sh`** (bloc `rapapp` + `chown`) est bien **sur le remote** `Rap_app_backend_V3` ; sinon les prochains deplois backend laisseront peut‑etre des fichiers en `abd` — `git pull` puis un redeploy ou `sudo bash deploy/vps_setup_rapapp_user.sh …` reapplique les droits. |
| Moyenne | **Sauvegardes PostgreSQL** : `pg_dump` planifie (cron + repertoire dedie, retention). |
| Moyenne | **Surveillance** : charge disque, RAM, services `gunicorn` / `nginx` (outil type Netdata, Uptime Kuma, ou alertes hebergeur). |
| Basse | **PostgreSQL** : migrer le role `"ABD"` vers `abd` (minuscules) quand tu auras une fenetre de maintenance. |
| Basse | **UFW** : supprimer les regles en double (80/443 vs *Nginx Full*) avec `sudo ufw status numbered` / `delete` si tu veux un affichage plus propre. |
