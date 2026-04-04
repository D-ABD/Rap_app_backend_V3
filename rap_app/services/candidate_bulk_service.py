from __future__ import annotations

from collections.abc import Iterable

from django.db import transaction

from ..models.atelier_tre import AtelierTRE
from ..models.candidat import Candidat
from .candidate_lifecycle_service import CandidateLifecycleService


class CandidateBulkService:
    """
    Opérations bulk sûres sur les candidats.

    Cette couche réutilise les services métier existants et retourne
    un contrat homogène pour les endpoints bulk :
    - summary
    - succeeded_ids
    - failed
    """

    @staticmethod
    def _empty_result():
        return {
            "summary": {"requested": 0, "succeeded": 0, "failed": 0},
            "succeeded_ids": [],
            "failed": [],
        }

    @classmethod
    def _finalize(cls, result):
        result["summary"]["succeeded"] = len(result["succeeded_ids"])
        result["summary"]["failed"] = len(result["failed"])
        return result

    @classmethod
    def _run_transition(cls, candidates: Iterable[Candidat], actor, transition_name: str):
        result = cls._empty_result()
        candidates = list(candidates)
        result["summary"]["requested"] = len(candidates)
        transition = getattr(CandidateLifecycleService, transition_name)

        for candidate in candidates:
            try:
                transition(candidate, actor=actor)
                result["succeeded_ids"].append(candidate.id)
            except Exception as exc:
                result["failed"].append({"id": candidate.id, "error": str(exc)})

        return cls._finalize(result)

    @classmethod
    def bulk_validate_inscription(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="validate_inscription")

    @classmethod
    def bulk_set_admissible(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="set_admissible")

    @classmethod
    def bulk_clear_admissible(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="clear_admissible")

    @classmethod
    def bulk_set_gespers(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="mark_gespers")

    @classmethod
    def bulk_clear_gespers(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="clear_gespers")

    @classmethod
    def bulk_start_formation(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="start_formation")

    @classmethod
    def bulk_abandon(cls, candidates: Iterable[Candidat], actor):
        return cls._run_transition(candidates, actor=actor, transition_name="abandon")

    @classmethod
    @transaction.atomic
    def bulk_assign_atelier_tre(cls, candidates: Iterable[Candidat], atelier: AtelierTRE):
        result = cls._empty_result()
        candidates = list(candidates)
        result["summary"]["requested"] = len(candidates)
        atelier_centre_id = getattr(atelier, "centre_id", None)

        valid = []
        for candidate in candidates:
            candidate_centre_id = getattr(getattr(candidate, "formation", None), "centre_id", None)
            if candidate_centre_id != atelier_centre_id:
                result["failed"].append(
                    {
                        "id": candidate.id,
                        "error": "Candidat hors centre de l'atelier.",
                    }
                )
                continue
            valid.append(candidate)

        if valid:
            atelier.candidats.add(*valid)
            result["succeeded_ids"].extend(candidate.id for candidate in valid)

        return cls._finalize(result)
