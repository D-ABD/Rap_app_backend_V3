# 🚀 Déploiement Frontend RAP_APP

## VPS : Hostinger (Ubuntu 24.04)
Dossier : `/srv/rap_app/front`

### 1️⃣ Installation initiale
```bash
sudo mkdir -p /srv/rap_app/front /var/www/rap_app_front
sudo chown -R abd:abd /srv/rap_app/front
cd /srv/rap_app/front
git clone https://github.com/D-ABD/Rap_app_MUI.git .
2️⃣ Déploiement
bash
Copier le code
./deploy.sh
3️⃣ Vérification
Frontend : https://rap.adserv.fr

API : https://rap.adserv.fr/api/

yaml
Copier le code

---

## 📦 5️⃣ Validation avant commit

Vérifie :
```bash
ls -1
Tu devrais voir au moins :

lua
Copier le code
deploy.sh
nginx_front.conf
README_DEPLOY.md
.env.production
package.json
vite.config.ts
Ensuite :

bash
Copier le code
git add deploy.sh nginx_front.conf README_DEPLOY.md
git commit -m "Ajout des fichiers de déploiement front (VPS Hostinger)"
git push origin main

