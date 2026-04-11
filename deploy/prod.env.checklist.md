# Production Env Checklist

Exemple minimal pour le `.env` de production a la racine du projet backend.

## Obligatoire

```env
DEBUG=False
SECRET_KEY=change_me_with_a_long_random_secret_key

ALLOWED_HOSTS=rap.adserv.fr,147.93.126.119
CSRF_TRUSTED_ORIGINS=https://rap.adserv.fr,http://rap.adserv.fr
CORS_ALLOWED_ORIGINS=https://rap.adserv.fr

DB_NAME=rap_app_backend
DB_USER=abd
DB_PASSWORD=change_me
DB_HOST=127.0.0.1
DB_PORT=5432

STATIC_ROOT=/srv/apps/rap_app/app/staticfiles
MEDIA_ROOT=/srv/apps/rap_app/shared/media
LOG_DIR=/srv/apps/rap_app/logs
```

## Securite recommandee

Pendant l'installation initiale, avant que le certificat Let’s Encrypt soit actif, garde temporairement :

```env
SECURE_SSL_REDIRECT=False
```

Une fois HTTPS valide via Nginx et certbot, repasse a :

```env
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY=same-origin
SECURE_CROSS_ORIGIN_OPENER_POLICY=same-origin
X_FRAME_OPTIONS=DENY
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

## Email

Exemple Google SMTP :

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=adserv.fr@gmail.com
EMAIL_HOST_PASSWORD=your-google-app-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
DEFAULT_FROM_EMAIL=RAP_APP <adserv.fr@gmail.com>
SERVER_EMAIL=adserv.fr@gmail.com
EMAIL_REPORT_TO=adserv.fr@gmail.com
DB_EMAIL_BACKUP_TO=adserv.fr@gmail.com
MAX_EMAIL_ATTACHMENT_MB=20
```

Note :

- l'IP dans `ALLOWED_HOSTS` peut aider pour certains tests directs ou en fallback
- `http://rap.adserv.fr` dans `CSRF_TRUSTED_ORIGINS` est surtout utile pendant la phase initiale d'installation ou de debug
- une fois la prod stabilisee en HTTPS strict, tu pourras simplifier si tu veux

## JWT

```env
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=30
JWT_REFRESH_TOKEN_LIFETIME_DAYS=1
```

## Import Excel

```env
RAP_IMPORT_PERSIST_JOBS=true
RAP_IMPORT_MAX_PARSE_SECONDS=120
RAP_IMPORT_LOG_MAX_BYTES=5242880
RAP_IMPORT_LOG_BACKUP_COUNT=5
```

## Frontend

Dans `frontend_rap_app/.env.production` ou dans l'environnement de build :

```env
VITE_APP_NAME=Rap App
VITE_API_BASE_URL=/api
```

Tu n'as generalement pas besoin de `VITE_BACKEND_PROXY_TARGET` en prod.
