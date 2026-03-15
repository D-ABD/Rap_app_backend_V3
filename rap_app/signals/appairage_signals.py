"""
Signaux pour la synchronisation des champs de placement entre Appairage et Candidat.
"""

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from ..models.appairage import Appairage, AppairageStatut
from ..models.candidat import Candidat, HistoriquePlacement


@receiver(post_save, sender=Appairage, dispatch_uid="rap_app.appairage.sync_appairage_to_candidat")
def sync_appairage_to_candidat(sender, instance: Appairage, created: bool, **kwargs):
    """
    Synchronise les champs de placement du Candidat lors de la sauvegarde d'un Appairage.
    Met à jour ou retire les données de placement sur le Candidat selon le statut de l'Appairage.
    """
    candidat = instance.candidat

    date_appairage = instance.date_appairage.date() if instance.date_appairage else None

    # Appairage accepté : placer le candidat si nécessaire
    if instance.statut == AppairageStatut.ACCEPTE:
        if not candidat.entreprise_placement:
            update_fields_placement = []

            if candidat.entreprise_placement != instance.partenaire:
                candidat.entreprise_placement = instance.partenaire
                update_fields_placement.append("entreprise_placement")

            if date_appairage and candidat.date_placement != date_appairage:
                candidat.date_placement = date_appairage
                update_fields_placement.append("date_placement")

            if hasattr(instance, "_user") and getattr(instance, "_user", None):
                if candidat.responsable_placement != instance._user:
                    candidat.responsable_placement = instance._user
                    update_fields_placement.append("responsable_placement")

            if hasattr(candidat, "resultat_placement"):
                if candidat.resultat_placement != "admis":
                    candidat.resultat_placement = "admis"
                    update_fields_placement.append("resultat_placement")

            if update_fields_placement:
                if "updated_at" not in update_fields_placement:
                    update_fields_placement.append("updated_at")
                candidat._from_appairage_signal = True
                try:
                    candidat.save(update_fields=update_fields_placement)
                finally:
                    if hasattr(candidat, "_from_appairage_signal"):
                        del candidat._from_appairage_signal

            if date_appairage:
                HistoriquePlacement.objects.get_or_create(
                    candidat=candidat,
                    date_placement=date_appairage,
                    entreprise=instance.partenaire,
                    resultat="admis",
                    defaults={"responsable": getattr(instance, "_user", None)},
                )

        return

    # Appairage retiré : retirer le placement si correspondance
    if not created and instance.statut != AppairageStatut.ACCEPTE:
        if candidat.entreprise_placement == instance.partenaire:
            update_fields_placement = []

            if candidat.entreprise_placement is not None:
                candidat.entreprise_placement = None
                update_fields_placement.append("entreprise_placement")

            if hasattr(candidat, "resultat_placement") and candidat.resultat_placement is not None:
                candidat.resultat_placement = None
                update_fields_placement.append("resultat_placement")

            if candidat.date_placement is not None:
                candidat.date_placement = None
                update_fields_placement.append("date_placement")

            if update_fields_placement:
                update_fields_placement.append("updated_at")
                candidat._from_appairage_signal = True
                try:
                    candidat.save(update_fields=update_fields_placement)
                finally:
                    if hasattr(candidat, "_from_appairage_signal"):
                        del candidat._from_appairage_signal


@receiver(post_delete, sender=Appairage, dispatch_uid="rap_app.appairage.unsync_appairage_from_candidat")
def unsync_appairage_from_candidat(sender, instance: Appairage, **kwargs):
    """
    Retire les champs de placement du Candidat si l'Appairage correspondant est supprimé.
    """
    candidat = instance.candidat

    if candidat.entreprise_placement != instance.partenaire:
        return

    update_fields_placement = []

    if candidat.entreprise_placement is not None:
        candidat.entreprise_placement = None
        update_fields_placement.append("entreprise_placement")

    if hasattr(candidat, "resultat_placement") and candidat.resultat_placement is not None:
        candidat.resultat_placement = None
        update_fields_placement.append("resultat_placement")

    if candidat.date_placement is not None:
        candidat.date_placement = None
        update_fields_placement.append("date_placement")

    if update_fields_placement:
        update_fields_placement.append("updated_at")
        candidat._from_appairage_signal = True
        try:
            candidat.save(update_fields=update_fields_placement)
        finally:
            if hasattr(candidat, "_from_appairage_signal"):
                del candidat._from_appairage_signal


@receiver(pre_save, sender=Candidat, dispatch_uid="rap_app.appairage.sync_candidat_to_appairage")
def sync_candidat_to_appairage(sender, instance: Candidat, **kwargs):
    """
    Met à jour le statut de l'Appairage associé si entreprise_placement du Candidat change manuellement.
    """
    if getattr(instance, "_from_appairage_signal", False):
        return

    if not instance.pk:
        return

    original = Candidat.objects.filter(pk=instance.pk).only("entreprise_placement").first()
    if not original:
        return

    if not instance.entreprise_placement or instance.entreprise_placement == original.entreprise_placement:
        return

    appairage = Appairage.objects.filter(
        candidat=instance,
        partenaire=instance.entreprise_placement,
        statut__in=[AppairageStatut.TRANSMIS, AppairageStatut.EN_ATTENTE],
    ).first()

    if not appairage:
        return

    appairage.statut = AppairageStatut.ACCEPTE
    try:
        appairage.save()
    except TypeError:
        appairage.save()
