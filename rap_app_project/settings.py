# rap_app_project/settings.py

"""
Paramètres Django pour le projet rap_app_project.
Lit les variables d'environnement nécessaires à la configuration.
"""

from pathlib import Path
from datetime import timedelta
import os
import sys
import warnings
from decouple import Config, RepositoryEnv
from django.core.exceptions import ImproperlyConfigured

# Répertoire de base du projet
BASE_DIR = Path(__file__).resolve().parent.parent

# Chargement du fichier d'environnement (.env.local prioritaire)
env_path = BASE_DIR / ".env.local" if os.path.exists(BASE_DIR / ".env.local") else BASE_DIR / ".env"
config = Config(RepositoryEnv(str(env_path)))

# Désactive certains avertissements en production
if not config("DEBUG", default="False").lower() == "true":
    warnings.filterwarnings("ignore", message=".*drf_spectacular.*")

def csv(name: str, default: str = "") -> list[str]:
    """
    Retourne une liste à partir d'une variable d'environnement au format CSV.
    """
    return [s.strip() for s in config(name, default=default).split(",") if s.strip()]

def _get_required_secret(name: str) -> str:
    """
    Retourne la valeur obligatoire d'une variable d'environnement. Lève ImproperlyConfigured si absente ou vide.
    """
    value = config(name, default=None)
    if not value or not str(value).strip():
        raise ImproperlyConfigured(
            f"La variable d'environnement {name} est obligatoire et ne doit pas être vide. "
            f"Définissez-la dans votre fichier .env ou .env.local (ou exportez-la) avant de lancer Django."
        )
    return str(value).strip()


SECRET_KEY = _get_required_secret("SECRET_KEY")
DEBUG = config("DEBUG", default="False").lower() == "true"

ALLOWED_HOSTS = csv("ALLOWED_HOSTS", default="localhost,rap.adserv.fr")


INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rap_app",

    "rest_framework",
    "django_filters",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "drf_spectacular_sidecar",
]

ENABLE_DJANGO_EXTENSIONS = config(
    "ENABLE_DJANGO_EXTENSIONS",
    default="True" if DEBUG else "False",
).lower() == "true"
if ENABLE_DJANGO_EXTENSIONS:
    INSTALLED_APPS.append("django_extensions")
JAZZMIN_SETTINGS = {
    "site_title": "RAP_APP — Administration",
    "site_header": "RAP_APP Admin",
    "site_brand": "RAP_APP",
    "site_logo": None,
    "login_logo": None,
    "login_logo_dark": None,
    "copyright": "RAP_APP © 2025",

    "theme": "darkly",
    "dark_mode_theme": "darkly",
    "show_ui_builder": False,

    "navigation_expanded": True,
    "breadcrumbs": True,

    "brand_color": "#0d6efd",
    "accent": "#0d6efd",

    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user",
        "auth.Group": "fas fa-users",

        "rap_app.Candidat": "fas fa-user-graduate",
        "rap_app.CVTheque": "fas fa-address-card",
        "rap_app.Formation": "fas fa-chalkboard-teacher",
        "rap_app.Prospection": "fas fa-briefcase",
        "rap_app.Prepa": "fas fa-dumbbell",
        "rap_app.Declic": "fas fa-bolt",
        "rap_app.Commentaire": "fas fa-comment",
        "rap_app.AteliersTRE": "fas fa-lightbulb",
        "rap_app.Appairage": "fas fa-link",
        "rap_app.Partenaires": "fas fa-handshake",
    },

    "topmenu_links": [
        {"name": "Dashboard", "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Site public", "url": "/", "new_window": True},
    ],

    "usermenu_links": [
        {"name": "Profil", "url": "admin:auth_user_change", "new_window": False},
    ],

    "show_sidebar": True,
    "navigation": [
        "rap_app",
    ],

    "welcome_sign": "Bienvenue dans RAP_APP — Mode Admin",
    "search_model": "auth.User",
}

JAZZMIN_UI_TWEAKS = {
    "theme": "darkly",
    "dark_mode_theme": "slate",
    "navbar": "navbar-dark bg-dark",
    "sidebar": "sidebar-dark-info",
    "accent": "accent-primary",
    "footer_fixed": False,
    "sidebar_fixed": True,
    "navbar_fixed": True,
}

# CurrentUserMiddleware doit suivre AuthenticationMiddleware
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "rap_app.middleware.CurrentUserMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "rap_app_project.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "rap_app_project" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "rap_app_project.wsgi.application"

AUTH_USER_MODEL = "rap_app.CustomUser"

# Configuration base de données PostgreSQL via variables d'environnement
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _get_required_secret("DB_NAME"),
        "USER": _get_required_secret("DB_USER"),
        "PASSWORD": _get_required_secret("DB_PASSWORD"),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
        # "ATOMIC_REQUESTS": True,
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
        "rap_app.api.permissions.IsStaffReadOnly",
    ],
    "EXCEPTION_HANDLER": "rap_app.api.exception_handler.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": (
        ["rest_framework.renderers.JSONRenderer"]
        if not DEBUG
        else [
            "rest_framework.renderers.JSONRenderer",
            "rest_framework.renderers.BrowsableAPIRenderer",
        ]
    ),
    "DEFAULT_PAGINATION_CLASS": "rap_app.api.paginations.RapAppPagination",
    "PAGE_SIZE": 10,
}

# Variables optionnelles pour la durée de vie des tokens JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 30))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 1))
    ),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Rap_app",
    "DESCRIPTION": "Documentation complète de l'API Rap_App pour l'application mobile et web.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": "/api/",
    "COMPONENT_NO_READ_ONLY_REQUIRED": True,
    "SCHEMA_PATH_PREFIX_TRIM": True,
    "CONTACT": {"name": "Équipe Rap_app", "email": "support@rap_app.app"},
    "LICENSE": {"name": "Propriétaire"},
    "PREPROCESSING_HOOKS": ["rap_app.spectacular_hooks.preprocess_hook"],
    "POSTPROCESSING_HOOKS": ["rap_app.spectacular_hooks.postprocess_hook"],
    "ENUM_NAME_OVERRIDES": {
        "StatutProspection": "rap_app.models.ProspectionChoices.PROSPECTION_STATUS_CHOICES",
        "ObjectifProspection": "rap_app.models.ProspectionChoices.PROSPECTION_OBJECTIF_CHOICES",
        "MotifProspection": "rap_app.models.ProspectionChoices.PROSPECTION_MOTIF_CHOICES",
        "TypeContact": "rap_app.models.ProspectionChoices.TYPE_CONTACT_CHOICES",
        "MoyenContact": "rap_app.models.ProspectionChoices.MOYEN_CONTACT_CHOICES",
        "AncienStatut": "rap_app.models.ProspectionChoices.PROSPECTION_STATUS_CHOICES",
        "NouveauStatut": "rap_app.models.ProspectionChoices.PROSPECTION_STATUS_CHOICES",
    },
    "ENUM_RENAME_ALTERNATIVES": {
        "StatutF44Enum": "StatutProspection",
        "Statut120Enum": "StatutHistorique",
    },
    "ENUM_GENERATE_CHOICE_DESCRIPTION": False,
    "GENERIC_ADDITIONAL_PROPERTIES": None,
}

CSRF_TRUSTED_ORIGINS = [
    "https://rap.adserv.fr",
    "https://app.adserv.fr",
]

CORS_ALLOWED_ORIGINS = [
    "https://rap.adserv.fr",
    "https://app.adserv.fr",
]

CORS_ALLOW_CREDENTIALS = True

# Ajout des origines locales en développement
if DEBUG:
    CSRF_TRUSTED_ORIGINS += [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    CORS_ALLOWED_ORIGINS += [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

EMAIL_BACKEND = config(
    "EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend"
)

LANGUAGE_CODE = "fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LOGIN_REDIRECT_URL = "profile"
LOGOUT_REDIRECT_URL = "login"
LOGIN_URL = "/login/"

USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Paramètres de sécurité pilotés par .env
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default="True").lower() == "true"
SESSION_COOKIE_SECURE = config("SESSION_COOKIE_SECURE", default="True").lower() == "true"
CSRF_COOKIE_SECURE = config("CSRF_COOKIE_SECURE", default="True").lower() == "true"
SESSION_COOKIE_SAMESITE = config("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = config("CSRF_COOKIE_SAMESITE", default="Lax")
SECURE_CONTENT_TYPE_NOSNIFF = config("SECURE_CONTENT_TYPE_NOSNIFF", default="True").lower() == "true"
SECURE_REFERRER_POLICY = config("SECURE_REFERRER_POLICY", default="same-origin")
SECURE_CROSS_ORIGIN_OPENER_POLICY = config("SECURE_CROSS_ORIGIN_OPENER_POLICY", default="same-origin")
SECURE_HSTS_SECONDS = int(config("SECURE_HSTS_SECONDS", default="0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = (
    config("SECURE_HSTS_INCLUDE_SUBDOMAINS", default="False").lower() == "true"
)
SECURE_HSTS_PRELOAD = config("SECURE_HSTS_PRELOAD", default="False").lower() == "true"

LOG_SENSITIVE_FIELDS = [
    "password",
    "token",
    "secret",
    "api_key",
    "auth",
    "credential",
    "authorization",
]
LOG_SANITIZATION_WARNINGS = True

LOG_DIR = os.path.join(BASE_DIR, "logs")
Path(LOG_DIR).mkdir(exist_ok=True)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {"format": "{levelname} {message}", "style": "{"},
        "audit": {
            "format": "{asctime} | {levelname} | {module} | {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "ERROR",
            "class": "logging.FileHandler",
            "filename": os.path.join(LOG_DIR, "errors.log"),
            "formatter": "verbose",
        },
        "console": {"level": "INFO", "class": "logging.StreamHandler", "formatter": "simple"},
        "audit_file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": os.path.join(LOG_DIR, "audit.log"),
            "formatter": "audit",
        },
    },
    "loggers": {
        "django": {"handlers": ["file", "console"], "level": "INFO", "propagate": True},
        "rap_app": {"handlers": ["file", "console", "audit_file"], "level": "INFO", "propagate": True},
        "rap_app.audit": {"handlers": ["audit_file"], "level": "INFO", "propagate": False},
        "rap_app.candidats": {
            "handlers": ["console", "audit_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        # "django.db.backends": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

ENABLE_MODEL_LOGGING = not DEBUG
LOG_MODELS = []
LOG_EXCLUDED_MODELS = ["auth.User", "sessions.Session", "contenttypes.ContentType"]

if "test" in sys.argv:
    DISABLE_MODEL_LOGS = True
    LOGGING["loggers"]["rap_app"]["level"] = "CRITICAL"
else:
    DISABLE_MODEL_LOGS = False

X_FRAME_OPTIONS = "SAMEORIGIN"
