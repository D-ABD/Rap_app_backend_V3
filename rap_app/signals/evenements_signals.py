"""Signaux de synchronisation légère entre événements et métriques formation.

Ces handlers maintiennent `Formation.nombre_evenements` et l'historique
associé. Ils restent actifs tant que cette responsabilité n'a pas été extraite
vers un service métier dédié.
"""

import logging
import sys

from django.apps import apps
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils.timezone import now

from ..middleware import (
    get_current_user,  # ThreadLocalMiddleware pour récupérer l'utilisateur
)
from ..models.evenements import Evenement
from ..models.formations import Formation, HistoriqueFormation

logger = logging.getLogger("rap_app.evenements")


def skip_during_migrations() -> bool:
    """
    Retourne True si l'application est en cours de migration.
    """
    return not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv


def _safe_related(instance, field_name: str):
    """Retourne une relation encore accessible, sinon None."""
    if not getattr(instance, f"{field_name}_id", None):
        return None
    try:
        return getattr(instance, field_name)
    except ObjectDoesNotExist:
        logger.debug("Relation %s introuvable pour %s #%s", field_name, instance.__class__.__name__, instance.pk)
        return None


def get_user_from_instance(instance):
    """
    Retourne l'utilisateur associé à l'instance.
    """
    return _safe_related(instance, "updated_by") or _safe_related(instance, "created_by") or get_current_user()


def maj_nombre_evenements(formation_id: int | None, operation: str, user=None):
    """
    Met à jour `Formation.nombre_evenements` et crée l'entrée d'historique liée.
    """
    if not formation_id:
        return

    try:
        with transaction.atomic():
            formation = Formation._base_manager.only("pk", "nombre_evenements").get(pk=formation_id)
            nouveau_total = Evenement.objects.filter(formation_id=formation_id).count()
            ancien_total = formation.nombre_evenements or 0

            if ancien_total != nouveau_total:
                Formation._base_manager.filter(pk=formation_id).update(nombre_evenements=nouveau_total, updated_at=now())

                logger.info(
                    f"MAJ nombre_evenements pour Formation #{formation_id} : {ancien_total} → {nouveau_total} ({operation})"
                )

                HistoriqueFormation.objects.create(
                    formation=formation,
                    champ_modifie="nombre_evenements",
                    ancienne_valeur=str(ancien_total),
                    nouvelle_valeur=str(nouveau_total),
                    commentaire=f"Mise à jour auto via signal (événement {operation})",
                    created_by=user,
                )
            else:
                logger.debug(f"Aucun changement de nombre_evenements sur Formation #{formation_id} ({nouveau_total})")

    except Formation.DoesNotExist:
        logger.debug("Formation #%s introuvable pendant la MAJ du nombre_evenements", formation_id)
    except Exception as e:
        logger.error(
            f"Erreur lors de la MAJ du nombre_evenements pour Formation #{formation_id} : {str(e)}", exc_info=True
        )


@receiver(post_save, sender=Evenement, dispatch_uid="rap_app.evenements_signals.evenement_post_save")
def evenement_post_save(sender, instance, created, **kwargs):
    """
    Met à jour nombre_evenements de la formation concernée lors de la création ou modification d'un Evenement.
    """
    if skip_during_migrations():
        return

    if not instance.formation_id:
        logger.debug("Événement sans formation associée (post_save)")
        return

    operation = "créé" if created else "modifié"
    user = get_user_from_instance(instance)
    maj_nombre_evenements(instance.formation_id, operation, user=user)


@receiver(post_delete, sender=Evenement, dispatch_uid="rap_app.evenements_signals.evenement_post_delete")
def evenement_post_delete(sender, instance, **kwargs):
    """
    Met à jour nombre_evenements de la formation concernée lors de la suppression d'un Evenement.
    """
    if skip_during_migrations():
        return

    if not instance.formation_id:
        logger.debug("Événement sans formation associée (post_delete)")
        return

    user = get_user_from_instance(instance)
    maj_nombre_evenements(instance.formation_id, "supprimé", user=user)
