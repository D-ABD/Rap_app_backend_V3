"""Services de résolution owner/formation/centre des prospections."""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from typing import TYPE_CHECKING, Any

from django.db import transaction

from ..api.roles import is_admin_like, is_candidate, is_staff_or_staffread

if TYPE_CHECKING:
    from rap_app.models.custom_user import CustomUser
    from rap_app.models.formations import Formation
    from rap_app.models.partenaires import Partenaire
    from rap_app.models.prospection import Prospection


_DEFER_PROSPECTION_OWNER_SYNC: ContextVar[bool] = ContextVar(
    "defer_prospection_owner_sync",
    default=False,
)


@contextmanager
def defer_prospection_owner_sync():
    """Suspend temporairement la résolution automatique owner/formation/centre."""
    token = _DEFER_PROSPECTION_OWNER_SYNC.set(True)
    try:
        yield
    finally:
        _DEFER_PROSPECTION_OWNER_SYNC.reset(token)


def is_prospection_owner_sync_deferred() -> bool:
    """Indique si la résolution automatique de prospection est suspendue."""
    return _DEFER_PROSPECTION_OWNER_SYNC.get()


class ProspectionOwnershipService:
    """
    Centralise la résolution explicite de `owner`, `formation` et `centre_id`
    pour les prospections.

    Règles clés :
    - un candidat créant/modifiant sa prospection devient son propre owner
    - si un owner candidat est connu, sa formation devient prioritaire
    - le `centre_id` est dérivé d'abord de la formation, puis éventuellement
      du partenaire ou de l'instance existante

    Ce service remplace l'ancien couplage implicite porté par les signaux
    autour de `owner.candidat_associe`.
    """

    @classmethod
    @transaction.atomic
    def resolve_and_sync_ownership(
        cls,
        *,
        actor: CustomUser,
        validated_data: dict[str, Any],
        instance: Prospection | None = None,
    ) -> dict[str, Any]:
        """
        Retourne un payload enrichi prêt à être sauvegardé par le serializer
        ou le viewset appelant.
        """
        owner = cls._resolve_owner(actor=actor, validated_data=validated_data, instance=instance)
        formation = cls._resolve_formation(actor=actor, owner=owner, validated_data=validated_data, instance=instance)
        partenaire = validated_data.get("partenaire") or getattr(instance, "partenaire", None)
        centre_id = cls._resolve_centre_id(formation=formation, partenaire=partenaire, instance=instance)

        payload = dict(validated_data)
        payload["owner"] = owner
        payload["formation"] = formation
        payload["centre_id"] = centre_id
        return payload

    @staticmethod
    def _get_owner_formation(owner: CustomUser | None):
        if not owner:
            return None
        candidat = getattr(owner, "candidat_associe", None) or getattr(owner, "candidat", None)
        return getattr(candidat, "formation", None)

    @classmethod
    def _resolve_owner(
        cls,
        *,
        actor: CustomUser,
        validated_data: dict[str, Any],
        instance: Prospection | None = None,
    ):
        if is_candidate(actor):
            return actor

        return validated_data.get("owner") or getattr(instance, "owner", None) or actor

    @classmethod
    def _resolve_formation(
        cls,
        *,
        actor: CustomUser,
        owner: CustomUser | None,
        validated_data: dict[str, Any],
        instance: Prospection | None = None,
    ):
        if is_candidate(actor):
            return cls._get_owner_formation(actor)

        owner_formation = cls._get_owner_formation(owner)
        if owner_formation is not None:
            return owner_formation

        return validated_data.get("formation", getattr(instance, "formation", None))

    @staticmethod
    def _resolve_centre_id(
        *,
        formation: Formation | None,
        partenaire: Partenaire | None,
        instance: Prospection | None = None,
    ) -> int | None:
        if formation is not None:
            return getattr(formation, "centre_id", None)
        if partenaire is not None:
            return getattr(partenaire, "default_centre_id", None) or getattr(instance, "centre_id", None)
        return getattr(instance, "centre_id", None)
