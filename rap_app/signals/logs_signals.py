"""
Définit les signaux pour la journalisation automatique des créations, modifications et suppressions d'instances,
via LogUtilisateur.log_action, selon la configuration Django.
"""

import logging
import os
import sys

from django.apps import apps
from django.conf import settings
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from ..models.logs import LogUtilisateur

logger = logging.getLogger(__name__)

# Exclusions par défaut côté modèle et application
EXCLUDED_MODELS = ["LogUtilisateur", "LogEntry", "Permission", "Group", "ContentType", "Session"]
EXCLUDED_APPS = ["admin", "contenttypes", "sessions", "auth"]


def skip_logging() -> bool:
    """
    Retourne True si les logs doivent être désactivés (migrations, tests, variable d'environnement, paramètre settings).
    """
    if not apps.ready or "migrate" in sys.argv or "test" in sys.argv:
        return True
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return True
    return getattr(settings, "DISABLE_MODEL_LOGS", False)


def should_log_model(instance) -> bool:
    """
    Retourne True si l'instance doit être journalisée selon les paramètres de configuration.
    """
    model_name = instance.__class__.__name__
    app_label = instance._meta.app_label
    model_path = f"{app_label}.{model_name}"

    if model_name in EXCLUDED_MODELS or app_label in EXCLUDED_APPS:
        return False

    excluded = getattr(settings, "LOG_EXCLUDED_MODELS", [])
    if model_path in excluded:
        return False

    whitelist = getattr(settings, "LOG_MODELS", None)
    if whitelist and model_path not in whitelist:
        return False

    return True


def get_user(instance, kwargs):
    """
    Cherche un utilisateur associé à l'action via kwargs ou attributs courants de l'instance.
    """
    return (
        kwargs.get("user")
        or getattr(instance, "_user", None)
        or getattr(instance, "updated_by", None)
        or getattr(instance, "created_by", None)
    )


@receiver(post_save, dispatch_uid="rap_app.logs_signals.log_save")
def log_save(sender, instance, created, **kwargs):
    """
    Journalise une création ou modification d'instance selon la configuration, après post_save.
    """
    if skip_logging() or not should_log_model(instance):
        return

    try:
        action = LogUtilisateur.ACTION_CREATE if created else LogUtilisateur.ACTION_UPDATE
        user = get_user(instance, kwargs)

        if created:
            details = f"Création de {instance.__class__.__name__} #{instance.pk}"
        elif hasattr(instance, "get_changed_fields") and callable(instance.get_changed_fields):
            changes = instance.get_changed_fields()
            if changes:
                changed_fields = ", ".join(changes.keys())
                details = f"Champs modifiés: {changed_fields}"
            else:
                details = f"Modification de {instance.__class__.__name__} #{instance.pk} (aucun changement détecté)"
        else:
            details = f"Modification de {instance.__class__.__name__} #{instance.pk}"

        LogUtilisateur.log_action(instance=instance, action=action, user=user, details=details)
    except Exception as e:
        current_action = action if "action" in locals() else "inconnue"
        logger.error(f"Erreur de log ({current_action}): {e}", exc_info=True)


@receiver(post_delete, dispatch_uid="rap_app.logs_signals.log_delete")
def log_delete(sender, instance, **kwargs):
    """
    Journalise la suppression d'une instance via post_delete, selon la configuration.
    """
    if skip_logging() or not should_log_model(instance):
        return

    try:
        user = get_user(instance, kwargs)
        details = f"Suppression de {instance.__class__.__name__} #{instance.pk}: {str(instance)}"

        LogUtilisateur.log_action(instance=instance, action=LogUtilisateur.ACTION_DELETE, user=user, details=details)
    except Exception as e:
        logger.error(f"Erreur de log (suppression): {e}", exc_info=True)


def setup_log_signals():
    """
    (À appeler dans AppConfig.ready.) Configure le branchement des signaux de log selon les paramètres.
    """
    try:
        post_save.disconnect(log_save)
        post_delete.disconnect(log_delete)
    except Exception:
        pass

    if getattr(settings, "DISABLE_MODEL_LOGS", False):
        logger.info("Système de logs utilisateur désactivé")
        return

    log_models = getattr(settings, "LOG_MODELS", [])

    if not log_models:
        logger.info("Système de logs utilisateur activé (mode global)")
        post_save.connect(log_save)
        post_delete.connect(log_delete)
        return

    for model_path in log_models:
        try:
            app_label, model_name = model_path.split(".")
            model = apps.get_model(app_label, model_name)

            post_save.connect(log_save, sender=model)
            post_delete.connect(log_delete, sender=model)

            logger.info(f"Logs activés pour {model_path}")
        except Exception as e:
            logger.error(f"Erreur config logs pour {model_path}: {e}")
