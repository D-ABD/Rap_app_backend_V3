"""
Signaux liés au modèle Centre.
"""

import logging
import sys
from django.db.models.signals import post_save, pre_delete, post_delete
from django.dispatch import receiver
from django.apps import apps

from ..models.centres import Centre
from ..models.logs import LogUtilisateur

audit_logger = logging.getLogger("rap_app.audit")


@receiver(post_save, sender=Centre, dispatch_uid="rap_app.centres.log_centre_save")
def log_centre_save(sender, instance, created, **kwargs):
    """
    Enregistre une action dans LogUtilisateur et un message d'audit lors de la création ou modification d'un Centre.
    """
    if not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv:
        return

    user = getattr(instance, "updated_by", None)

    LogUtilisateur.log_action(
        instance=instance,
        action="création" if created else "modification",
        user=user,
        details="Création ou mise à jour d'un centre",
    )

    audit_logger.info(
        "Nouveau centre créé" if created else "Centre mis à jour",
        extra={
            "user": "system",
            "action": "création" if created else "modification",
            "object": f"Centre #{instance.pk} - {instance.nom}",
        },
    )


@receiver(pre_delete, sender=Centre, dispatch_uid="rap_app.centres.log_centre_deleted")
def log_centre_deleted(sender, instance, **kwargs):
    """
    Ajoute une entrée d'audit avant la suppression d'un Centre.
    """
    audit_logger.info(
        "Centre supprimé (pré-delete)",
        extra={
            "user": "system",
            "action": "suppression",
            "object": f"Centre #{instance.pk} - {instance.nom}",
        },
    )


@receiver(post_delete, sender=Centre, dispatch_uid="rap_app.centres.invalidate_centre_cache_on_delete")
def invalidate_centre_cache_on_delete(sender, instance, **kwargs):
    """
    Invalide le cache lié à l'instance Centre supprimée.
    """
    instance.invalidate_caches()
