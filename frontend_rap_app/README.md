🧾 GUIDE DE DÉPLOIEMENT — Frontend RAP_APP

📦 Technos principales :

React + TypeScript + Vite

Nginx (reverse proxy & static serving)

Node.js v24.x (LTS)

Déploiement sur le même VPS que le backend
(Ubuntu 24.04 — Hostinger VPS)

📍 Nom de domaine : https://rap.adserv.fr

🧠 Objectif :
Servir le frontend React en production via Nginx,
avec communication API vers le backend Django (/api/).

⚙️ 1️⃣ Arborescence principale
/srv/rap_app/
│
├── backend/                → Django + Gunicorn
└── front/                  → Frontend React (Vite)
    ├── src/                → Code source React
    ├── dist/               → Build temporaire (auto-généré)
    ├── logs/               → Logs Nginx (frontend)
    ├── deploy.sh           → Script de déploiement
    ├── setup_front_vps.sh  → Script d’installation initiale
    ├── .env.production     → Variables d’environnement prod
    ├── nginx_front_https.conf → Exemple de conf HTTPS
    └── README_DEPLOY.md    → Notes et rappels


🗂️ Le site compilé est ensuite servi depuis :

/var/www/rap_app_front/

⚙️ 2️⃣ Installation initiale sur le VPS

Sur le VPS, dans /srv/rap_app/front :

# Cloner le dépôt
git clone https://github.com/D-ABD/Rap_app_MUI.git /srv/rap_app/front
cd /srv/rap_app/front

# Donner les droits d’exécution
chmod +x setup_front_vps.sh

# Lancer l’installation
./setup_front_vps.sh


Ce script :

installe Node.js 24 et npm

installe les dépendances (npm install)

crée les dossiers /var/www/rap_app_front et /srv/rap_app/front/logs

configure Nginx

recharge le service

⚙️ 3️⃣ Variables d’environnement

Créer ou mettre à jour .env.production :

VITE_API_URL=https://rap.adserv.fr/api
VITE_APP_NAME=RAP_APP
VITE_BACKEND_URL=https://rap.adserv.fr
VITE_DEBUG=false


⚠️ Ne pas committer ce fichier (il est ignoré par .gitignore).

⚙️ 4️⃣ Configuration Nginx

Un seul bloc de conf gère maintenant le front + le back :
/etc/nginx/sites-available/rap_app

server {
    listen 80;
    server_name rap.adserv.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name rap.adserv.fr;

    ssl_certificate /etc/letsencrypt/live/rap.adserv.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rap.adserv.fr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # 🌐 FRONTEND (React)
    root /var/www/rap_app_front;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    # ⚙️ BACKEND (Django API)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    access_log /srv/rap_app/front/logs/nginx_access.log;
    error_log  /srv/rap_app/front/logs/nginx_error.log;
}

⚙️ 5️⃣ Déploiement de mise à jour

Quand tu veux déployer une nouvelle version du frontend :

cd /srv/rap_app/front
./deploy.sh


Ce script :

Fait un git pull

Installe les dépendances (npm install)

Compile le projet (npm run build)

Copie les fichiers dans /var/www/rap_app_front

Recharge Nginx (systemctl reload nginx)

Vérifie la disponibilité via curl

Tu verras :

✅ Déploiement FRONT terminé avec succès !
HTTP/1.1 200 OK

🧩 6️⃣ Vérification et supervision
Vérifier le service Nginx :
sudo systemctl status nginx

Vérifier le build servi :
curl -I https://rap.adserv.fr


→ doit renvoyer HTTP/2 200 OK

Vérifier la communication API :
curl -I https://rap.adserv.fr/api/


→ HTTP/1.1 401 Unauthorized = OK (le backend répond)

🧰 7️⃣ Maintenance et automatisation
🔁 Redéploiement automatique (optionnel)

Tu peux ajouter une tâche cron pour redéployer chaque nuit :

crontab -e


et ajouter :

0 3 * * * cd /srv/rap_app/front && ./deploy.sh >> /srv/rap_app/front/logs/cron.log 2>&1

🧱 8️⃣ Commandes utiles
Commande	Action
./setup_front_vps.sh	Installation complète (1re fois)
./deploy.sh	Build + déploiement du front
npm run dev	Lancer le front en mode développement
sudo nginx -t	Tester la config Nginx
sudo systemctl reload nginx	Recharger Nginx
sudo tail -f /srv/rap_app/front/logs/error.log	Voir les erreurs Nginx front
✅ Vérification finale
Élément	Statut attendu
https://rap.adserv.fr
	Affiche le front React
https://rap.adserv.fr/api/
	Répond 401 (API backend OK)
HTTPS	Activé et valide
Nginx	Actif (systemctl status nginx)