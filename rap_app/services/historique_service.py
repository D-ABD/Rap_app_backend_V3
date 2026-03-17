from __future__ import annotations

from datetime import date

from django.apps import apps
from django.db import transaction

"""
Services minimalistes d'historisation du placement candidat.

Le module détecte les changements sur les champs de placement suivis et crée
une entrée `HistoriquePlacement` lorsque le snapshot a évolué.
"""

PLACEMENT_FIELDS = (
    "entreprise_placement_id",
    "resultat_placement",
    "date_placement",
    "responsable_placement_id",
    "contrat_signe",
)


def placement_fields_changed(candidat, original=None) -> bool:
    """
    Détermine si un snapshot de placement diffère d'un état précédent.

    Si `original` est fourni, la comparaison est champ par champ. Sinon, la
    fonction vérifie si au moins un champ de placement est renseigné.
    """
    if original is not None:
        return any(getattr(original, field) != getattr(candidat, field) for field in PLACEMENT_FIELDS)

    def _is_set(value):
        return value not in (None, "", False)

    return any(_is_set(getattr(candidat, field)) for field in PLACEMENT_FIELDS)


def creer_historique_placement_si_necessaire(candidat, original=None):
    """
    Crée un `HistoriquePlacement` uniquement si les champs suivis ont changé.
    """
    if not placement_fields_changed(candidat, original=original):
        return None

    HistoriquePlacement = apps.get_model("rap_app", "HistoriquePlacement")
    # Import local to avoid circular imports while still using the canonical enum definition.
    from ..models.candidat import ResultatPlacementChoices

    with transaction.atomic():
        return HistoriquePlacement.objects.create(
            candidat=candidat,
            date_placement=candidat.date_placement or date.today(),
            entreprise=candidat.entreprise_placement,
            resultat=candidat.resultat_placement or ResultatPlacementChoices.EN_ATTENTE,
            responsable=candidat.responsable_placement,
            commentaire="Historique créé automatiquement à la modification du placement.",
        )
