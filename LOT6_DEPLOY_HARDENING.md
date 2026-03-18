# LOT6_DEPLOY_HARDENING

## Objectif

Sécuriser le backend pour un déploiement plus propre sans casser les contrats front existants.

## Changements

- `/api/me/` s'appuie maintenant sur `CustomUserSerializer` au lieu d'un snapshot interne potentiellement trop large.
- Les settings de sécurité HTTP ont des valeurs de durcissement explicites :
  `SESSION_COOKIE_SAMESITE`, `CSRF_COOKIE_SAMESITE`, `SECURE_CONTENT_TYPE_NOSNIFF`,
  `SECURE_REFERRER_POLICY`, `SECURE_CROSS_ORIGIN_OPENER_POLICY`.
- `django_extensions` n'est plus chargé par défaut hors debug.
- `Document.clean()` vérifie désormais la cohérence entre extension, MIME détecté et `type_document`.
- L'échec JWT via `/api/token/` renvoie un message générique, pour ne pas exposer si un compte existe ou non.

## Vérifications préprod à faire

- définir explicitement `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` et `CORS_ALLOWED_ORIGINS` pour l'environnement cible ;
- vérifier que `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` et HSTS sont cohérents avec le proxy TLS réel ;
- laisser `ENABLE_DJANGO_EXTENSIONS=False` hors dev ;
- vérifier manuellement `/api/token/`, `/api/token/refresh/`, `/api/me/` et un upload document en préprod.

## Tests ajoutés

- `/api/me/` ne doit pas exposer `password`, `groups`, `user_permissions`, `last_login`.
- obtention et refresh JWT via `/api/token/` et `/api/token/refresh/`.
- échec JWT avec message générique dans l'enveloppe d'erreur API standardisée.
- refus d'un document dont le contenu détecté ne correspond pas à son extension/type.
