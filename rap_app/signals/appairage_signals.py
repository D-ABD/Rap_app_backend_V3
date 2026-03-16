"""
Signaux pour la synchronisation des champs de placement entre Appairage et Candidat.
"""

import logging

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from ..models.appairage import Appairage, AppairageStatut
from ..models.candidat import Candidat
from ..services.placement_services import is_appairage_snapshot_sync_deferred

logger = logging.getLogger("rap_app.signals.appairage")


@receiver(post_save, sender=Appairage, dispatch_uid="rap_app.appairage.sync_appairage_to_candidat")
def sync_appairage_to_candidat(sender, instance: Appairage, created: bool, **kwargs):
    """
    Synchronise les champs de placement du Candidat lors de la sauvegarde d'un Appairage.
    Met à jour ou retire les données de placement sur le Candidat selon le statut de l'Appairage.
    """
    if is_appairage_snapshot_sync_deferred() or getattr(instance, "_placement_synced_by_service", False):
        return

    logger.warning(
        "SIGNAL_EXECUTION_DETECTED signal=sync_appairage_to_candidat appairage_id=%s candidat_id=%s created=%s statut=%s",
        getattr(instance, "pk", None),
        getattr(instance, "candidat_id", None),
        created,
        getattr(instance, "statut", None),
    )

    # Legacy logic intentionally disabled.
    # Kept as comment reference during Phase 4 in case a non-API residual flow
    # (shell, script, import) still depends on this handler.
    #
    # Previous behavior:
    # - on accepted appairage, mirror partenaire/date/responsable/resultat on candidat
    # - create HistoriquePlacement if needed
    # - on non-accepted update, clear placement fields when they matched this partenaire
    return


@receiver(post_delete, sender=Appairage, dispatch_uid="rap_app.appairage.unsync_appairage_from_candidat")
def unsync_appairage_from_candidat(sender, instance: Appairage, **kwargs):
    """
    Retire les champs de placement du Candidat si l'Appairage correspondant est supprimé.
    """
    if is_appairage_snapshot_sync_deferred() or getattr(instance, "_placement_synced_by_service", False):
        return

    logger.warning(
        "SIGNAL_EXECUTION_DETECTED signal=unsync_appairage_from_candidat appairage_id=%s candidat_id=%s statut=%s",
        getattr(instance, "pk", None),
        getattr(instance, "candidat_id", None),
        getattr(instance, "statut", None),
    )

    # Legacy logic intentionally disabled.
    # Previous behavior:
    # - on appairage delete, clear candidat placement fields if they matched the deleted partenaire
    return


@receiver(pre_save, sender=Candidat, dispatch_uid="rap_app.appairage.sync_candidat_to_appairage")
def sync_candidat_to_appairage(sender, instance: Candidat, **kwargs):
    """
    Met à jour le statut de l'Appairage associé si entreprise_placement du Candidat change manuellement.
    """
    if getattr(instance, "_from_appairage_signal", False):
        return

    logger.warning(
        "SIGNAL_EXECUTION_DETECTED signal=sync_candidat_to_appairage candidat_id=%s entreprise_placement_id=%s",
        getattr(instance, "pk", None),
        getattr(instance, "entreprise_placement_id", None),
    )

    # Legacy logic intentionally disabled.
    # Previous behavior:
    # - if candidat.entreprise_placement changed manually,
    #   find a matching transmitted/pending appairage and switch it to ACCEPTE
    return
