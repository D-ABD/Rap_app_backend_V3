from __future__ import annotations

from datetime import datetime, time

from django.db.models import Count, Q
from django.utils import timezone

from ..models.candidat import Candidat
from ..models.formations import Formation
from ..models.rapports import Rapport


def _candidate_en_formation_q() -> Q:
    return (
        Q(parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        | Q(statut=Candidat.StatutCandidat.EN_FORMATION)
    )


class RapportDataBuilderService:
    """
    Génération enrichie des données de rapport.

    Cette première couche vise les rapports candidats/formations compatibles
    avec la nouvelle logique de phase, sans casser les contenus JSON déjà
    stockés. Le résultat est fusionné dans `donnees`.
    """

    @staticmethod
    def _start_of_day(value):
        if not value:
            return None
        return timezone.make_aware(datetime.combine(value, time.min))

    @staticmethod
    def _end_of_day(value):
        if not value:
            return None
        return timezone.make_aware(datetime.combine(value, time.max))

    @classmethod
    def _candidate_queryset(cls, rapport: Rapport):
        qs = Candidat.objects.all()
        if rapport.centre_id:
            qs = qs.filter(formation__centre_id=rapport.centre_id)
        if rapport.formation_id:
            qs = qs.filter(formation_id=rapport.formation_id)
        if rapport.type_offre_id:
            qs = qs.filter(formation__type_offre_id=rapport.type_offre_id)
        if rapport.statut_id:
            qs = qs.filter(formation__statut_id=rapport.statut_id)
        if rapport.date_debut:
            qs = qs.filter(date_inscription__gte=cls._start_of_day(rapport.date_debut))
        if rapport.date_fin:
            qs = qs.filter(date_inscription__lte=cls._end_of_day(rapport.date_fin))
        return qs

    @classmethod
    def _formation_queryset(cls, rapport: Rapport):
        qs = Formation.objects.all()
        if rapport.centre_id:
            qs = qs.filter(centre_id=rapport.centre_id)
        if rapport.formation_id:
            qs = qs.filter(id=rapport.formation_id)
        if rapport.type_offre_id:
            qs = qs.filter(type_offre_id=rapport.type_offre_id)
        if rapport.statut_id:
            qs = qs.filter(statut_id=rapport.statut_id)
        if rapport.date_debut:
            qs = qs.filter(start_date__gte=rapport.date_debut)
        if rapport.date_fin:
            qs = qs.filter(end_date__lte=rapport.date_fin)
        return qs

    @classmethod
    def build_phase_summary(cls, rapport: Rapport) -> dict:
        cand_qs = cls._candidate_queryset(rapport)
        formation_qs = cls._formation_queryset(rapport)

        phase_counts = {
            row["parcours_phase"] or "non_renseigne": row["count"]
            for row in cand_qs.values("parcours_phase").annotate(count=Count("id")).order_by("parcours_phase")
        }
        legacy_status_counts = {
            row["statut"] or "non_renseigne": row["count"]
            for row in cand_qs.values("statut").annotate(count=Count("id")).order_by("statut")
        }

        compatible = cand_qs.aggregate(
            total=Count("id"),
            inscrits_valides=Count(
                "id",
                filter=Q(parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE),
            ),
            stagiaires_en_formation=Count(
                "id",
                filter=Q(parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION),
            ),
            sortis=Count("id", filter=Q(parcours_phase=Candidat.ParcoursPhase.SORTI)),
            abandons=Count("id", filter=Q(parcours_phase=Candidat.ParcoursPhase.ABANDON)),
            en_formation_compatible=Count("id", filter=_candidate_en_formation_q()),
        )

        return {
            "generated_by": "RapportDataBuilderService",
            "reporting_contract": rapport.get_reporting_contract(),
            "scope": {
                "centre_id": rapport.centre_id,
                "formation_id": rapport.formation_id,
                "type_offre_id": rapport.type_offre_id,
                "statut_id": rapport.statut_id,
                "date_debut": str(rapport.date_debut) if rapport.date_debut else None,
                "date_fin": str(rapport.date_fin) if rapport.date_fin else None,
            },
            "formations": {
                "total": formation_qs.count(),
            },
            "candidats": {
                **{k: int(v or 0) for k, v in compatible.items()},
                "parcours_phase_counts": phase_counts,
                "legacy_statut_counts": legacy_status_counts,
            },
        }

    @classmethod
    def build_for_rapport(cls, rapport: Rapport) -> dict:
        if not rapport.get_reporting_contract()["phase_compatible"]:
            return {}
        return {"phase_summary": cls.build_phase_summary(rapport)}
