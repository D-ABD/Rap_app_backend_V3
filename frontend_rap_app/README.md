# RAP_APP Frontend

Frontend React + TypeScript + Vite du monorepo RAP_APP.

## Stack

- React `18`
- TypeScript
- Vite
- Material UI
- TanStack Query
- React Router
- Axios
- Recharts

## Structure

Principaux dossiers :

- [src/pages/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/pages) : ecrans metier
- [src/components/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/components) : composants partages
- [src/api/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/api) : clients HTTP, auth, import/export
- [src/hooks/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/hooks) : hooks applicatifs
- [src/routes/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/routes) : routing
- [src/layout/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/layout) : layouts et navigation
- [src/config/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/config) : lecture de l'environnement frontend
- [src/utils/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/utils) : helpers

Fichiers utiles :

- [package.json](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/package.json)
- [.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/.env.example)
- [vite.config.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/vite.config.ts)
- [src/config/env.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/config/env.ts)
- [src/api/axios.ts](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/src/api/axios.ts)

## Variables d'environnement

Copier l'exemple :

```bash
cp .env.example .env.local
```

Variables principales :

```env
VITE_APP_NAME=Rap App Frontend
VITE_API_BASE_URL=/api
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:8000
```

Comportement :

- en dev, Axios cible `${VITE_BACKEND_PROXY_TARGET}/api`
- en prod, Axios cible `VITE_API_BASE_URL` et force le suffixe `/api`
- le proxy Vite redirige `/api` vers `VITE_BACKEND_PROXY_TARGET`

## Installation locale

Prerequis :

- Node.js `20+`
- npm

Installation :

```bash
cd frontend_rap_app
npm ci
cp .env.example .env.local
npm run dev
```

Le frontend tourne alors en dev avec Vite, pendant que le backend Django tourne sur `127.0.0.1:8000`.

## Scripts npm

Developpement :

```bash
npm run dev
npm run preview
```

Qualite :

```bash
npm run lint
npm run lint:fix
npm run type-check
npm run format:check
npm run format
```

Build :

```bash
npm run build
```

Tests :

```bash
npm run test
```

## Lancement local complet

Terminal 1, backend :

```bash
source env/bin/activate
python manage.py runserver 0.0.0.0:8000
```

Terminal 2, frontend :

```bash
cd frontend_rap_app
npm ci
npm run dev
```

## Production

Le frontend n'est plus deployee comme une app separee.

Architecture retenue :

- domaine : `rap.adserv.fr`
- API : `/api`
- build frontend : `/var/www/rap_app_front`
- racine applicative VPS : `/srv/apps/rap_app/app`

Documentation utile :

- [../deploy/DEPLOY.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/DEPLOY.md)
- [../deploy/VPS_DEPLOY_REPORT.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/VPS_DEPLOY_REPORT.md)
- [../deploy/commandes_deploy.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/commandes_deploy.md)
- [../deploy/deploy_frontend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_frontend.sh)

Variable de production attendue :

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

## Points d'attention connus

- il reste un warning de bundle Vite : chunk principal lourd
- il reste un reliquat `npm audit` faible autour de `quill`
- le warning Vite sur `src/api/axios.ts` importe statiquement et dynamiquement est non bloquant, mais merite une optimisation plus tard

## Liens utiles

- backend du projet : [../README.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/README.md)
- guide deploy : [../deploy/DEPLOY.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/DEPLOY.md)
