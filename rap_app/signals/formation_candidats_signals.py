"""Signaux de synchronisation légère entre candidats et métriques formation.

Ces handlers maintiennent `Formation.nombre_candidats` à partir de la relation
réelle `Formation -> Candidat`.
"""

import logging
import sys

from django.apps import apps
from django.db import transaction
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver
from django.utils.timezone import now

from ..middleware import get_current_user
from ..models.candidat import Candidat
from ..models.formations import Formation, HistoriqueFormation

logger = logging.getLogger("rap_app.formation_candidats")


def skip_during_migrations() -> bool:
    """Retourne True si l'application est en cours de migration."""
    return not apps.ready or "migrate" in sys.argv or "makemigrations" in sys.argv


def get_user_from_instance(instance):
    """Retourne l'utilisateur associé à l'instance ou au contexte courant."""
    return getattr(instance, "updated_by", None) or getattr(instance, "created_by", None) or get_current_user()


def maj_nombre_candidats(formation_id: int | None, operation: str, user=None):
    """
    Met à jour `Formation.nombre_candidats` pour une formation donnée
    et historise le changement si nécessaire.
    """
    if not formation_id:
        return

    try:
        with transaction.atomic():
            formation_qs = Formation._base_manager.all()
            formation = formation_qs.only("pk", "nombre_candidats").get(pk=formation_id)
            nouveau_total = Candidat.objects.filter(formation_id=formation_id).count()
            ancien_total = formation.nombre_candidats or 0

            if ancien_total != nouveau_total:
                formation_qs.filter(pk=formation_id).update(nombre_candidats=nouveau_total, updated_at=now())

                logger.info(
                    "MAJ nombre_candidats pour Formation #%s : %s -> %s (%s)",
                    formation_id,
                    ancien_total,
                    nouveau_total,
                    operation,
                )

                HistoriqueFormation.objects.create(
                    formation=formation,
                    champ_modifie="nombre_candidats",
                    ancienne_valeur=str(ancien_total),
                    nouvelle_valeur=str(nouveau_total),
                    commentaire=f"Mise à jour auto via signal (candidat {operation})",
                    created_by=user,
                )
            else:
                logger.debug("Aucun changement de nombre_candidats sur Formation #%s (%s)", formation_id, nouveau_total)
    except Formation.DoesNotExist:
        logger.debug("Formation #%s introuvable pendant la MAJ du nombre_candidats", formation_id)
    except Exception as exc:
        logger.error(
            "Erreur lors de la MAJ du nombre_candidats pour Formation #%s : %s",
            formation_id,
            exc,
            exc_info=True,
        )


@receiver(pre_save, sender=Candidat, dispatch_uid="rap_app.formation_candidats_signals._remember_old_formation")
def remember_old_formation(sender, instance: Candidat, **kwargs):
    """Stocke la formation précédente pour détecter les réaffectations de session."""
    if not instance.pk:
        instance._old_formation_id = None  # type: ignore[attr-defined]
        return
    try:
        instance._old_formation_id = sender.objects.only("formation_id").get(pk=instance.pk).formation_id  # type: ignore[attr-defined]
    except sender.DoesNotExist:
        instance._old_formation_id = None  # type: ignore[attr-defined]


@receiver(post_save, sender=Candidat, dispatch_uid="rap_app.formation_candidats_signals.candidat_post_save")
def candidat_post_save(sender, instance: Candidat, created: bool, **kwargs):
    """Met à jour les compteurs des formations impactées après création ou modification."""
    if skip_during_migrations():
        return

    user = get_user_from_instance(instance)
    old_formation_id = getattr(instance, "_old_formation_id", None)
    new_formation_id = instance.formation_id

    if created:
        maj_nombre_candidats(new_formation_id, "créé", user=user)
        return

    if old_formation_id != new_formation_id:
        maj_nombre_candidats(old_formation_id, "réaffecté", user=user)
        maj_nombre_candidats(new_formation_id, "réaffecté", user=user)


@receiver(post_delete, sender=Candidat, dispatch_uid="rap_app.formation_candidats_signals.candidat_post_delete")
def candidat_post_delete(sender, instance: Candidat, **kwargs):
    """Met à jour le compteur de la formation lors de la suppression d'un candidat."""
    if skip_during_migrations():
        return
    maj_nombre_candidats(instance.formation_id, "supprimé", user=get_user_from_instance(instance))
