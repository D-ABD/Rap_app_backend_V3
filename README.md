# RAP_APP Backend

Backend Django du monorepo RAP_APP.

Le depot contient :

- le backend Django a la racine
- le frontend React/Vite dans [frontend_rap_app/README.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/frontend_rap_app/README.md)
- les scripts et la documentation de deploiement dans [deploy/DEPLOY.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/DEPLOY.md)

## Stack

- Django `4.2`
- Django REST Framework
- PostgreSQL
- JWT avec `djangorestframework_simplejwt`
- documentation API avec `drf-spectacular`
- admin theme avec `Jazzmin`
- Gunicorn + Nginx en production

## Structure

Principaux dossiers :

- [rap_app/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app) : application metier
- [rap_app/api/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/api) : API REST, serializers, viewsets, import/export
- [rap_app/models/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/models) : modeles metier
- [rap_app/services/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/services) : services applicatifs
- [rap_app/tests/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app/tests) : tests backend
- [rap_app_project/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/rap_app_project) : settings, urls, wsgi
- [deploy/](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy) : scripts de deploiement et docs ops

Fichiers utiles :

- [manage.py](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/manage.py)
- [.env.example](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/.env.example)
- [requirements.txt](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/requirements.txt)
- [requirements-prod.txt](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/requirements-prod.txt)
- [pytest.ini](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/pytest.ini)

## Environnement local

Le backend lit :

- `.env.local` en priorite si present
- sinon `.env`

Copier l'exemple :

```bash
cp .env.example .env.local
```

Variables minimales a renseigner :

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

Variables souvent utiles aussi :

- `CSRF_TRUSTED_ORIGINS`
- `CORS_ALLOWED_ORIGINS`
- `EMAIL_*`
- `LOG_DIR`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`
- `JWT_REFRESH_TOKEN_LIFETIME_DAYS`

## Installation locale

Prerequis :

- Python `3.12` recommande
- PostgreSQL

Installation :

```bash
python3 -m venv env
source env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env.local
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Commandes backend utiles

Checks :

```bash
python manage.py check
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
```

Migrations :

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py showmigrations
```

Server :

```bash
python manage.py runserver 0.0.0.0:8000
```

Static :

```bash
python manage.py collectstatic --noinput
```

Commande metier disponible :

```bash
python manage.py check_appairage_uniqueness
```

## Tests backend

Configuration pytest :

- `DJANGO_SETTINGS_MODULE=rap_app_project.settings`
- `--reuse-db` actif par defaut

Exemples :

```bash
pytest
pytest rap_app/tests/ -v
pytest --create-db rap_app/tests/ -v -q
pytest rap_app/tests/tests_api -v
```

## Endpoints utiles

Routes principales backend :

- `/admin/`
- `/health/`
- `/api/`
- `/api/schema/`
- `/api/docs/`
- `/api/redoc/`

En local :

- backend : `http://127.0.0.1:8000`
- swagger : `http://127.0.0.1:8000/api/docs/`
- redoc : `http://127.0.0.1:8000/api/redoc/`

## Production

La production est documentee ici :

- [deploy/DEPLOY.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/DEPLOY.md)
- [deploy/VPS_DEPLOY_REPORT.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/VPS_DEPLOY_REPORT.md)
- [deploy/commandes_deploy.md](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/commandes_deploy.md)

Scripts principaux :

- [deploy/deploy_backend.sh](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/deploy_backend.sh)
- [deploy/gunicorn_rapapp.service](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/gunicorn_rapapp.service)
- [deploy/nginx_rap_app.conf](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/deploy/nginx_rap_app.conf)

## Notes utiles

- les requirements de production sont dans [requirements-prod.txt](/Users/abd/Documents/GIT/RapApp/Rap_App_Dj_V2-main/requirements-prod.txt)
- `pytest` et les outils de test ne sont pas installes en prod par le script backend
- le projet utilise `Jazzmin`, ce qui explique certains warnings `collectstatic` non bloquants sur les assets admin
- la doc API `drf-spectacular` est active et exposee via `/api/docs/`

