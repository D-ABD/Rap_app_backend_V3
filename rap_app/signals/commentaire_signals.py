"""Signaux de recalcul léger autour des commentaires de formation.

Ces handlers mettent encore à jour certains indicateurs de formation après
création ou suppression d'un commentaire. Ils constituent un candidat naturel
à une future extraction vers un service de métriques plus explicite.
"""

import logging

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from ..models.commentaires import Commentaire
from ..models.formations import Formation

logger = logging.getLogger(__name__)


def update_formation_stats_on_save(commentaire: Commentaire):
    """
    Recalcule les indicateurs de formation impactés après sauvegarde.
    """
    try:
        with transaction.atomic():
            formation = commentaire.formation
            if not formation:
                return

            updates = {}

            # Met à jour la saturation si elle est renseignée sur le commentaire
            if commentaire.saturation is not None:
                updates["saturation"] = commentaire.saturation
                logger.info(f"Saturation mise à jour sur formation #{formation.id} → {commentaire.saturation}%")

            # Met à jour le champ dernier_commentaire avec le dernier commentaire lié à la formation
            dernier = Commentaire.objects.filter(formation=formation).order_by("-created_at").first()
            if dernier:
                updates["dernier_commentaire"] = dernier.contenu

            # Calcule la saturation moyenne si le champ existe sur la formation
            if hasattr(formation, "saturation_moyenne"):
                from django.db.models import Avg

                saturation_avg = (
                    Commentaire.objects.filter(formation=formation, saturation__isnull=False)
                    .aggregate(Avg("saturation"))
                    .get("saturation__avg")
                )
                updates["saturation_moyenne"] = saturation_avg
                logger.info(f"Saturation moyenne calculée: {saturation_avg}%")

            # Met à jour le nombre de commentaires si le champ existe sur la formation
            if hasattr(formation, "nb_commentaires"):
                nb_commentaires = Commentaire.objects.filter(formation=formation).count()
                updates["nb_commentaires"] = nb_commentaires
                logger.info(f"Nombre de commentaires mis à jour: {nb_commentaires}")

            if updates:
                Formation.objects.filter(id=formation.id).update(**updates)
                logger.debug(f"Formation #{formation.id} mise à jour suite à post_save")
    except Exception as e:
        logger.error(f"Erreur post_save Commentaire : {e}", exc_info=True)


def update_formation_stats_on_delete(commentaire: Commentaire):
    """
    Recalcule les indicateurs de formation impactés après suppression.
    """
    try:
        with transaction.atomic():
            formation = commentaire.formation
            if not formation:
                return

            logger.info(f"Commentaire supprimé, mise à jour formation #{formation.id}")

            updates = {}
            dernier = Commentaire.objects.filter(formation=formation).order_by("-created_at").first()
            contenu = dernier.contenu if dernier else ""
            updates["dernier_commentaire"] = contenu

            if hasattr(formation, "saturation_moyenne"):
                from django.db.models import Avg

                saturation_avg = (
                    Commentaire.objects.filter(formation=formation, saturation__isnull=False)
                    .aggregate(Avg("saturation"))
                    .get("saturation__avg")
                )
                updates["saturation_moyenne"] = saturation_avg
                logger.info(f"Saturation moyenne recalculée: {saturation_avg}%")

            if hasattr(formation, "nb_commentaires"):
                nb_commentaires = Commentaire.objects.filter(formation=formation).count()
                updates["nb_commentaires"] = nb_commentaires
                logger.info(f"Nombre de commentaires mis à jour: {nb_commentaires}")

            Formation.objects.filter(id=formation.id).update(**updates)
            logger.debug(f"Statistiques recalculées sur formation #{formation.id}")
    except Exception as e:
        logger.error(f"Erreur post_delete Commentaire : {e}", exc_info=True)


@receiver(post_save, sender=Commentaire, dispatch_uid="rap_app.commentaire_signals.commentaire_post_save")
def commentaire_post_save(sender, instance, created, **kwargs):
    """
    Met à jour les statistiques de la formation associée après la sauvegarde d'un commentaire.
    """
    action = "créé" if created else "modifié"
    logger.debug(f"[Signal] Commentaire #{instance.pk} {action} pour formation #{instance.formation_id}")
    update_formation_stats_on_save(instance)


@receiver(post_delete, sender=Commentaire, dispatch_uid="rap_app.commentaire_signals.commentaire_post_delete")
def commentaire_post_delete(sender, instance, **kwargs):
    """
    Met à jour les statistiques de la formation associée après la suppression d'un commentaire.
    """
    logger.debug(f"[Signal] Commentaire #{instance.pk} supprimé de formation #{instance.formation_id}")
    update_formation_stats_on_delete(instance)
