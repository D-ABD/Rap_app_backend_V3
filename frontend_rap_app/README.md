# Frontend RAP_APP

Frontend React + TypeScript + Vite du monorepo RAP_APP.

Le deploiement production n'est plus gere comme une application separee. Le frontend et le backend cohabitent dans le meme repo et sur le meme domaine :

- domaine : `rap.adserv.fr`
- API : `/api`
- build frontend : `/var/www/rap_app_front`
- racine applicative VPS : `/srv/apps/rap_app/app`

Pour le deploiement complet, utiliser la documentation racine :

- [`../deploy/DEPLOY.md`](../deploy/DEPLOY.md)
- [`../deploy/commandes_deploy.md`](../deploy/commandes_deploy.md)
- [`../deploy/deploy_frontend.sh`](../deploy/deploy_frontend.sh)

Variable de production attendue :

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

En local, le proxy Vite peut continuer a cibler le backend de developpement via `VITE_BACKEND_PROXY_TARGET`.
