"""
Signaux permettant de journaliser la création ou modification d'une instance de Rapport.
"""

import logging
import sys

from django.apps import apps
from django.db.models.signals import post_save
from django.dispatch import receiver

from ..models.logs import LogUtilisateur
from ..models.rapports import Rapport

logger = logging.getLogger("rap_app.rapports")


def skip_during_migrations() -> bool:
    """
    Retourne True si l'application est en cours de migration.
    """
    return not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv


@receiver(post_save, sender=Rapport, dispatch_uid="rap_app.rapports_signals.log_rapport_creation")
def log_rapport_creation(sender, instance: Rapport, created: bool, **kwargs):
    """
    Déclenche la création d'une entrée dans LogUtilisateur lors de l'enregistrement d'un Rapport.
    """
    if skip_during_migrations():
        return

    try:
        action = LogUtilisateur.ACTION_CREATE if created else LogUtilisateur.ACTION_UPDATE
        user = getattr(instance, "created_by", None)

        if user and not hasattr(user, "username"):
            user = None

        type_display = (
            instance.get_type_rapport_display() if hasattr(instance, "get_type_rapport_display") else "Type inconnu"
        )

        LogUtilisateur.log_action(
            instance=instance,
            action=action,
            user=user,
            details=f"{action.capitalize()} du rapport : {instance.nom} ({type_display})",
        )

        logger.info(f"[Signal] {action.capitalize()} du rapport #{instance.pk} : {instance.nom}")
    except Exception as e:
        logger.warning(f"Erreur lors du signal post_save Rapport : {e}", exc_info=True)
