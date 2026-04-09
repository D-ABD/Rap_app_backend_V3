# 📘 README TECHNIQUE – RAP_APP_FRONT  
### (Frontend du projet RAP_APP_DJ_V2)

---

## 🧩 1️⃣ Description du projet

Le **frontend** est une application **SPA** (Single Page Application) basée sur **React + TypeScript + Vite**, servie par **Nginx** depuis :

```
/srv/rap_app_front/
```

Elle communique avec le backend **Django (RAP_APP_DJ_V2)** via :

```
/api/
```

Le frontend est **compilé directement sur le VPS** à partir du dépôt GitHub, puis servi en production par Nginx.

---

## ⚙️ 2️⃣ Environnement serveur

### 🔹 Composants installés

- **Node.js 20.x** (via dépôt officiel NodeSource)  
- **Nginx 1.24.0** (avec HTTP/2 + SSL via Let’s Encrypt)  
- **Modules de compression Brotli** :
  - `ngx_http_brotli_filter_module`
  - `ngx_http_brotli_static_module`

### 🔹 Installation initiale de Node.js (à faire une seule fois)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs build-essential
```

---

## 📂 3️⃣ Emplacements clés

| Élément | Chemin |
|----------|--------|
| Racine frontend | `/srv/rap_app_front/` |
| Config Nginx | `/etc/nginx/sites-available/rap_app_dj_v2` |
| Fichiers statiques Django | `/srv/rap_app_dj_v2/staticfiles/` |
| Fichiers médias Django | `/srv/rap_app_dj_v2/media/` |
| Modules Brotli compilés | `/etc/nginx/modules/` |
| Logs Nginx frontend | `/var/log/nginx/rap_app_access.log`, `/var/log/nginx/rap_app_error.log` |

---

## 🌐 4️⃣ Configuration Nginx (extrait)

```nginx
# ==============================
# 🧱 Frontend (dist)
# ==============================
root /srv/rap_app_front;
index index.html;

# Toutes les routes non /api ou /admin → frontend
location / {
    try_files $uri $uri/ /index.html;
}

# ⚡ Compression Brotli & Gzip
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json image/svg+xml application/xml+rss;

gzip on;
gzip_vary on;
gzip_min_length 256;
gzip_comp_level 5;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss image/svg+xml;

# 🧱 Caches et logs
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

access_log /var/log/nginx/rap_app_access.log;
error_log  /var/log/nginx/rap_app_error.log;
```

✅ Vérification :
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧱 5️⃣ Modules Brotli (compilés manuellement)

Les modules suivants ont été compilés depuis Nginx 1.24.0 et installés dans `/etc/nginx/modules/` :

```
ngx_http_brotli_filter_module.so
ngx_http_brotli_static_module.so
```

Activation dans `/etc/nginx/nginx.conf` :

```nginx
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;
```

Test :
```bash
curl -I -H "Accept-Encoding: br" https://rap.adserv.fr/
# content-encoding: br → OK
```

---

## 🚀 6️⃣ Nouvelle procédure de déploiement (build sur le VPS)

Le déploiement du frontend se fait **directement sur le VPS** via un **script automatisé** qui :
1. Met à jour le dépôt GitHub (`git pull`)
2. Installe les dépendances (`npm ci`)
3. Compile le frontend (`npm run build`)
4. Recharge Nginx (`systemctl reload nginx`)
5. Crée une **sauvegarde automatique** du build précédent

### 📄 Script : `/srv/rap_app_dj_v2/deploy_front_vps.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement du frontend depuis GitHub vers le VPS..."
DATE=$(date '+%Y-%m-%d_%H-%M-%S')
BACKUP_DIR="/srv/rap_app_front_backups"
mkdir -p "$BACKUP_DIR"

if [ -d "/srv/rap_app_front/dist" ]; then
  echo "🗃️ Sauvegarde de l'ancien build vers : $BACKUP_DIR/dist_backup_$DATE.tar.gz"
  tar -czf "$BACKUP_DIR/dist_backup_$DATE.tar.gz" /srv/rap_app_front/dist
fi

cd /srv/rap_app_front
echo "📦 Récupération de la dernière version du dépôt..."
git fetch origin main
git reset --hard origin/main

echo "🔧 Installation des dépendances..."
npm ci

echo "🏗️ Construction du build de production..."
npm run build

echo "🔁 Rechargement de Nginx..."
systemctl reload nginx

echo "✅ Déploiement terminé avec succès !"
echo "📁 Sauvegardes disponibles dans : $BACKUP_DIR"
```

---

## ⚙️ 7️⃣ Commande de déploiement unique

Sur le VPS :
```bash
cd /srv/rap_app_dj_v2
./deploy_front_vps.sh
```

---

## ✅ Exemple de log de déploiement réussi

```
🚀 Déploiement du frontend depuis GitHub vers le VPS...
📅 Date : 2025-10-29 20:01:52
🗃️ Sauvegarde de l'ancien build vers : /srv/rap_app_front_backups/dist_backup_2025-10-29_20-01-52.tar.gz
📦 Récupération de la dernière version du dépôt...
🔧 Installation des dépendances...
🏗️ Construction du build de production...
✅ Déploiement terminé avec succès !
📁 Sauvegardes disponibles dans : /srv/rap_app_front_backups
```

---

## 🧠 8️⃣ Vérifications post-déploiement

### 🔹 Vérifier le contenu servi :
```bash
curl -I -H "Accept-Encoding: br,gzip" https://rap.adserv.fr/
```

Vérifie :
- `content-encoding: br` → compression Brotli active  
- `Cache-Control` présent → cache activé  
- Code HTTP `200 OK`  

### 🔹 Vérifier le cache :
```bash
curl -I https://rap.adserv.fr/
```

---

## 🔒 9️⃣ Sécurité et performances

✅ HTTPS + HTTP/2  
✅ Headers de sécurité :
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
✅ Cache Nginx actif  
✅ Brotli + Gzip opérationnels  

---

## 🧩 10️⃣ Environnement local de développement

### Installation initiale :
```bash
npm install
```

### Scripts utiles :
| Commande | Description |
|-----------|-------------|
| `npm run dev` | Lance le serveur local Vite |
| `npm run build` | Compile le projet pour la prod |
| `npm run preview` | Simule la prod localement |
| `npm run lint` | Vérifie la qualité du code |
| `npm run type-check` | Vérifie les types TypeScript |

---

## 🧠 11️⃣ Bonnes pratiques

- Toujours **committer sur `main`** avant déploiement  
- Toujours **tester localement avec `npm run preview`**  
- Ne **jamais modifier directement `/srv/rap_app_front`**  
- Si un build échoue : vérifier les logs de `vite build`  
- Sauvegardes auto dans `/srv/rap_app_front_backups/`  

---

## ✅ FIN DU DOCUMENT

Ce document décrit la **configuration serveur complète**,  
le **workflow de développement et de déploiement moderne**,  
et les **bonnes pratiques** pour maintenir le frontend RAP_APP à long terme.

🕓 Version générée automatiquement le 2025-10-29 21:00:54
