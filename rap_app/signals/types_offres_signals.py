import logging
import sys

from django.apps import apps
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from ..models.logs import LogUtilisateur
from ..models.types_offre import TypeOffre

logger = logging.getLogger("rap_app.typeoffre")


def skip_during_migrations() -> bool:
    """
    Retourne True si l'application est en migration.
    """
    return not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv


@receiver(post_save, sender=TypeOffre, dispatch_uid="rap_app.types_offres_signals.log_type_offre_save")
def log_type_offre_save(sender, instance, created, **kwargs):
    """
    Crée un log utilisateur lors de la création ou modification d'un TypeOffre.
    Ajoute également un message dans le logger applicatif.
    """
    if skip_during_migrations():
        return

    try:
        action = "Création" if created else "Mise à jour"
        user = getattr(instance, "_user", None)

        LogUtilisateur.log_action(
            instance=instance, action=action, user=user, details=f"{action} du type d'offre : {instance.nom}"
        )

        logger.info(f"[Signal] {action} du type d'offre #{instance.pk} : {instance.nom}")

    except Exception as e:
        logger.warning(f"[Signal] Échec log utilisateur pour TypeOffre #{instance.pk} : {e}", exc_info=True)


@receiver(post_delete, sender=TypeOffre, dispatch_uid="rap_app.types_offres_signals.log_type_offre_delete")
def log_type_offre_delete(sender, instance, **kwargs):
    """
    Crée un log utilisateur lors de la suppression d'un TypeOffre.
    Ajoute également un message dans le logger applicatif.
    """
    if skip_during_migrations():
        return

    try:
        user = getattr(instance, "_user", None)

        LogUtilisateur.log_action(
            instance=instance,
            action="Suppression",
            user=user,
            details=f"Suppression du type d'offre : {instance.nom} (ID: {instance.pk})",
        )

        logger.warning(f"[Signal] Suppression du type d'offre #{instance.pk} : {instance.nom}")

    except Exception as e:
        logger.error(f"[Signal] Échec log suppression TypeOffre #{instance.pk} : {e}", exc_info=True)
