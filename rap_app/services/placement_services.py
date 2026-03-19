from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import TYPE_CHECKING, Any

from django.db import transaction
from django.utils import timezone

from .historique_service import PLACEMENT_FIELDS, creer_historique_placement_si_necessaire

if TYPE_CHECKING:
    from rap_app.models.appairage import Appairage
    from rap_app.models.candidat import Candidat
    from rap_app.models.custom_user import CustomUser


_DEFER_APPAIRAGE_SNAPSHOT_SYNC: ContextVar[bool] = ContextVar(
    "defer_appairage_snapshot_sync",
    default=False,
)


@contextmanager
def defer_appairage_snapshot_sync():
    token = _DEFER_APPAIRAGE_SNAPSHOT_SYNC.set(True)
    try:
        yield
    finally:
        _DEFER_APPAIRAGE_SNAPSHOT_SYNC.reset(token)


def is_appairage_snapshot_sync_deferred() -> bool:
    return _DEFER_APPAIRAGE_SNAPSHOT_SYNC.get()


class AppairagePlacementService:
    """
    Synchronise explicitement le snapshot de placement d'un candidat
    à partir de l'état courant des appairages.

    Ce service est la source de vérité métier visée pour la synchronisation
    Appairage -> Candidat, en remplacement progressif des anciens signaux et
    hooks modèle.
    """

    @classmethod
    @transaction.atomic
    def sync_after_save(
        cls,
        appairage: Appairage,
        actor: CustomUser | None = None,
        previous_candidat: Candidat | None = None,
    ) -> dict[str, list[str]]:
        """
        Resynchronise le candidat courant, puis éventuellement l'ancien
        candidat si l'appairage a été réaffecté.

        Retourne les champs modifiés par cible (`current`, `previous`).
        """
        changes: dict[str, list[str]] = {}

        changes["current"] = cls._sync_candidate_from_latest_appairage(
            candidat=appairage.candidat,
            actor=actor,
            appairage=appairage,
        )

        if previous_candidat and previous_candidat.pk != appairage.candidat_id:
            changes["previous"] = cls._sync_candidate_from_latest_appairage(
                candidat=previous_candidat,
                actor=actor,
                appairage=None,
            )

        appairage._placement_synced_by_service = True
        return changes

    @classmethod
    def _sync_candidate_from_latest_appairage(
        cls,
        candidat: Candidat | None,
        actor: CustomUser | None = None,
        appairage: Appairage | None = None,
    ) -> list[str]:
        """
        Reconstruit le snapshot de placement du candidat à partir de
        l'appairage de référence puis historise si quelque chose change.
        """
        if candidat is None:
            return []

        original = candidat.__class__.objects.filter(pk=candidat.pk).only(*PLACEMENT_FIELDS).first()
        reference_appairage = cls._get_reference_appairage(candidat=candidat, appairage=appairage)
        snapshot = cls.build_snapshot_from_appairage(reference_appairage, actor=actor)
        changed_fields = cls.apply_snapshot_to_candidat(candidat, snapshot, actor=actor)

        if changed_fields:
            creer_historique_placement_si_necessaire(candidat, original=original)

        return changed_fields

    @classmethod
    @transaction.atomic
    def sync_candidate_snapshot(
        cls,
        candidat: Candidat | None,
        actor: CustomUser | None = None,
    ) -> list[str]:
        """
        Resynchronise explicitement le snapshot de placement d'un candidat
        à partir de son dernier appairage actif.
        """
        return cls._sync_candidate_from_latest_appairage(candidat=candidat, actor=actor, appairage=None)

    @classmethod
    def _get_reference_appairage(
        cls,
        candidat: Candidat,
        appairage: Appairage | None = None,
    ) -> Appairage | None:
        if appairage is not None and getattr(appairage, "candidat_id", None) == getattr(candidat, "pk", None):
            return appairage._last_appairage_for(candidat)

        from ..models.appairage import Appairage as AppairageModel
        from ..models.appairage import AppairageActivite

        return (
            AppairageModel.objects.filter(
                candidat_id=candidat.pk,
                activite=AppairageActivite.ACTIF,
            )
            .order_by("-date_appairage", "-pk")
            .select_related("partenaire", "created_by", "updated_by")
            .first()
        )

    @classmethod
    def build_snapshot_from_appairage(
        cls,
        appairage: Appairage | None,
        actor: CustomUser | None = None,
    ) -> dict[str, Any]:
        """
        Transforme l'état d'un appairage en snapshot normalisé pour les
        champs de placement du candidat.
        """
        from ..models.appairage import AppairageStatut
        from ..models.candidat import Candidat

        if appairage is None:
            return {
                "entreprise_placement": None,
                "responsable_placement": None,
                "resultat_placement": None,
                "date_placement": None,
                "entreprise_validee": None,
                "contrat_signe": None,
                "placement_appairage": None,
                "statut": Candidat.StatutCandidat.AUTRE,
            }

        resultat = appairage._STATUS_TO_RESULTAT.get(appairage.statut)
        responsable = actor or getattr(appairage, "updated_by", None) or getattr(appairage, "created_by", None)
        entreprise = appairage.partenaire if appairage.statut not in (AppairageStatut.REFUSE, AppairageStatut.ANNULE) else None
        entreprise_validee = appairage.partenaire if appairage.statut in appairage._ACCEPTED_STATUSES else None
        contrat = (
            Candidat.ContratSigne.EN_COURS
            if appairage.statut in appairage._CONTRACT_STATUSES
            else None
        )
        date_placement = appairage.date_appairage.date() if appairage.date_appairage else timezone.now().date()

        return {
            "entreprise_placement": entreprise,
            "responsable_placement": responsable,
            "resultat_placement": resultat,
            "date_placement": date_placement,
            "entreprise_validee": entreprise_validee,
            "contrat_signe": contrat,
            "placement_appairage": appairage,
            "statut": Candidat.StatutCandidat.EN_APPAIRAGE,
        }

    @classmethod
    def apply_snapshot_to_candidat(
        cls,
        candidat: Candidat,
        snapshot: dict[str, Any],
        actor: CustomUser | None = None,
    ) -> list[str]:
        """
        Applique au candidat uniquement les champs réellement modifiés puis
        sauvegarde l'objet en marquant les drapeaux techniques nécessaires.
        """
        changed_fields: list[str] = []

        for field, value in snapshot.items():
            if hasattr(candidat, f"{field}_id") and (value is None or hasattr(value, "pk")):
                current_value = getattr(candidat, f"{field}_id")
                target_value = None if value is None else value.pk
            else:
                current_value = getattr(candidat, field)
                target_value = value

            if current_value != target_value:
                setattr(candidat, field, value)
                changed_fields.append(field)

        if not changed_fields:
            return []

        candidat._from_appairage_signal = True
        candidat._skip_placement_history = True
        try:
            try:
                candidat.save(user=actor)
            except TypeError:
                candidat.save()
        finally:
            if hasattr(candidat, "_from_appairage_signal"):
                del candidat._from_appairage_signal
            if hasattr(candidat, "_skip_placement_history"):
                del candidat._skip_placement_history

        return changed_fields
