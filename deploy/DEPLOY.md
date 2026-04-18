# Deploy

Point d'entree unique pour la documentation de deploiement et d'exploitation.

Etat actuel :

- l'application est deja deployee sur `rap.adserv.fr`
- le detail reel du serveur ne vit plus ici
- ce fichier sert de guide d'orientation, pas de procedure exhaustive

## Quel fichier utiliser

### 1. Etat reel du serveur

Utiliser :

- [deploy/VPS_DEPLOY_REPORT.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/VPS_DEPLOY_REPORT.md)

Ce fichier contient :

- l'etat final du VPS
- les services actifs
- les ports ouverts
- les sauvegardes
- le monitoring
- les alertes email
- les risques restants
- les commandes executees
- la checklist finale

C'est la reference principale pour savoir **ce qui existe vraiment en production**.

### 2. Commandes d'exploitation quotidiennes

Utiliser :

- [deploy/commandes_deploy.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/commandes_deploy.md)

Ce fichier contient :

- `git pull`
- redeploy backend
- redeploy frontend
- redeploy complet
- restart services
- logs utiles
- checks HTTP
- backups manuels
- restauration DB
- monitoring
- commandes PostgreSQL utiles

C'est la reference principale pour **mettre a jour l'app et l'exploiter au quotidien**.

### 3. Fichiers techniques de deploiement

Les fichiers actifs sont dans :

- [deploy/deploy_backend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_backend.sh)
- [deploy/deploy_frontend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_frontend.sh)
- [deploy/gunicorn_rapapp.service](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/gunicorn_rapapp.service)
- [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf)
- [deploy/prod.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/prod.env.example)
- [deploy/prod.env.checklist.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/prod.env.checklist.md)

## Workflow normal maintenant

### Si tu modifies le code en local

1. commit et push en local
2. sur le VPS :

```bash
cd /srv/apps/rap_app/app
git pull origin main
bash deploy/deploy_backend.sh
bash deploy/deploy_frontend.sh
sudo systemctl restart gunicorn_rapapp
sudo systemctl reload nginx
curl -Ik https://rap.adserv.fr/health/
```

### Si tu veux juste verifier l'etat du serveur

Lire :

- [deploy/VPS_DEPLOY_REPORT.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/VPS_DEPLOY_REPORT.md)

### Si tu veux juste executer une commande utile

Lire :

- [deploy/commandes_deploy.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/commandes_deploy.md)

## Ce fichier ne doit plus contenir

- les mots de passe
- le contenu reel du `.env`
- l'historique complet des actions VPS
- la fiche d'exploitation quotidienne

## Resume

- `DEPLOY.md` = point d'entree
- `deploy/VPS_DEPLOY_REPORT.md` = realite du serveur
- `deploy/commandes_deploy.md` = commandes utiles en prod

## Emplacement Virtualenv
/srv/apps/rap_app/venv 

## Comment voir le fichier .env?
cat .env

## Comment se connecter à psql
psql -U ABD -d rap_app_backend -h localhost -p 5432

## Comment savoir qui est le user ?
SELECT current_user;
SELECT tablename, tableowner
FROM pg_tables
WHERE tablename = 'rap_app_formation';