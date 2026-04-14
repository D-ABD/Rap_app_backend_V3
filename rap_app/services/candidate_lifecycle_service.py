"""Services métier du cycle de vie candidat."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models.candidat import Candidat
from ..models.formations import Formation
from ..models.types_offre import TypeOffre
from .candidate_account_service import CandidateAccountService


class CandidateLifecycleService:
    """
    Centralise les transitions explicites du cycle candidat.

    Règles actuelles :
    - la validation de l'entrée dans le parcours de recrutement reste distincte
      de l'inscription GESPERS, qui est désormais manuelle ;
    - les états manuels `admissible`, `inscrit GESPERS`,
      `en accompagnement TRE` et `en appairage` sont pilotés via des flags
      cumulables et réversibles ;
    - l'entrée en formation et l'abandon restent des transitions pilotées par
      le backend ;
    - le champ legacy `statut` est encore maintenu pour compatibilité
      descendante, mais il reflète seulement la meilleure approximation
      possible des états manuels cumulables.
    """

    @classmethod
    def _sync_legacy_status_from_manual_flags(cls, candidate: Candidat) -> str:
        """
        Aligne le champ `statut` historique sur les nouveaux flags manuels
        lorsqu'aucune transition structurée (formation / abandon) n'est active.
        """
        if candidate.parcours_phase == Candidat.ParcoursPhase.ABANDON:
            return Candidat.StatutCandidat.ABANDON
        if candidate.parcours_phase == Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION:
            return Candidat.StatutCandidat.EN_FORMATION
        if candidate.en_appairage:
            return Candidat.StatutCandidat.EN_APPAIRAGE
        if candidate.en_accompagnement_tre:
            return Candidat.StatutCandidat.EN_ACCOMPAGNEMENT
        return Candidat.StatutCandidat.AUTRE

    @classmethod
    def _target_phase_without_live_training(cls, candidate: Candidat) -> str:
        if candidate.inscrit_gespers or candidate.date_validation_inscription:
            return Candidat.ParcoursPhase.INSCRIT_VALIDE
        return Candidat.ParcoursPhase.POSTULANT

    @classmethod
    def _counts_in_formation_inscrits(cls, candidate: Candidat) -> bool:
        return bool(
            candidate.formation_id
            and (
                candidate.date_validation_inscription
                or candidate.date_entree_formation_effective
                or candidate.parcours_phase
                in {
                    Candidat.ParcoursPhase.INSCRIT_VALIDE,
                    Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
                    Candidat.ParcoursPhase.SORTI,
                }
            )
        )

    @classmethod
    def _is_crif_formation(cls, candidate: Candidat) -> bool:
        formation = getattr(candidate, "formation", None)
        type_offre = getattr(formation, "type_offre", None)
        return getattr(type_offre, "nom", None) == TypeOffre.CRIF

    @classmethod
    def _adjust_formation_counter(cls, formation_id: int | None, *, crif: bool, delta: int, actor=None) -> None:
        if not delta or not formation_id:
            return

        formation = Formation._base_manager.select_for_update().get(pk=formation_id)
        field = "inscrits_crif" if crif else "inscrits_mp"
        current_value = getattr(formation, field) or 0
        next_value = max(current_value + delta, 0)

        if next_value == current_value:
            return

        setattr(formation, field, next_value)
        formation.save(user=actor, update_fields=[field])

    @classmethod
    def _adjust_formation_inscrits(cls, candidate: Candidat, *, delta: int, actor=None) -> None:
        cls._adjust_formation_counter(
            candidate.formation_id,
            crif=cls._is_crif_formation(candidate),
            delta=delta,
            actor=actor,
        )

    @classmethod
    def _sync_formation_inscrits_from_transition(cls, candidate: Candidat, *, was_counted: bool, actor=None) -> None:
        is_counted = cls._counts_in_formation_inscrits(candidate)
        if was_counted == is_counted:
            return
        cls._adjust_formation_inscrits(candidate, delta=1 if is_counted else -1, actor=actor)

    @classmethod
    def sync_candidate_formation_inscrits(
        cls,
        candidate: Candidat,
        *,
        previous_formation_id: int | None = None,
        previous_was_counted: bool = False,
        previous_was_crif: bool = False,
        actor=None,
    ) -> None:
        current_formation_id = candidate.formation_id
        current_was_counted = cls._counts_in_formation_inscrits(candidate)
        current_was_crif = cls._is_crif_formation(candidate) if current_formation_id else False

        if previous_formation_id == current_formation_id and previous_was_counted == current_was_counted:
            return

        if previous_formation_id and previous_was_counted:
            cls._adjust_formation_counter(
                previous_formation_id,
                crif=previous_was_crif,
                delta=-1,
                actor=actor,
            )

        if current_formation_id and current_was_counted:
            cls._adjust_formation_counter(
                current_formation_id,
                crif=current_was_crif,
                delta=1,
                actor=actor,
            )

    @classmethod
    @transaction.atomic
    def validate_inscription(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Valide l'entrée dans le parcours de recrutement sans forcer
        l'inscription GESPERS, qui reste une décision manuelle.
        """
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

        was_counted = cls._counts_in_formation_inscrits(candidate)
        now = timezone.now()
        updates = []

        if candidate.parcours_phase != Candidat.ParcoursPhase.INSCRIT_VALIDE:
            candidate.parcours_phase = Candidat.ParcoursPhase.INSCRIT_VALIDE
            updates.append("parcours_phase")

        if candidate.date_validation_inscription is None:
            candidate.date_validation_inscription = now
            updates.append("date_validation_inscription")

        if updates:
            candidate.save(user=actor, update_fields=updates)

        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)

        return candidate

    @classmethod
    @transaction.atomic
    def set_admissible(cls, candidate: Candidat, actor=None) -> Candidat:
        """Active manuellement l'état admissible."""
        updates = []
        if not candidate.admissible:
            candidate.admissible = True
            updates.append("admissible")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def clear_admissible(cls, candidate: Candidat, actor=None) -> Candidat:
        """Retire manuellement l'état admissible."""
        updates = []
        if candidate.admissible:
            candidate.admissible = False
            updates.append("admissible")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def start_formation(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Enregistre l'entrée effective en formation puis aligne, si possible, le
        rôle utilisateur en `stagiaire`.
        """
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

        was_counted = cls._counts_in_formation_inscrits(candidate)
        now = timezone.now()
        updates = []

        if candidate.date_validation_inscription is None:
            candidate.date_validation_inscription = now
            updates.append("date_validation_inscription")

        if candidate.parcours_phase != Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION:
            candidate.parcours_phase = Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION
            updates.append("parcours_phase")

        if candidate.date_entree_formation_effective is None:
            candidate.date_entree_formation_effective = now
            updates.append("date_entree_formation_effective")

        if candidate.statut != Candidat.StatutCandidat.EN_FORMATION:
            candidate.statut = Candidat.StatutCandidat.EN_FORMATION
            updates.append("statut")

        if updates:
            candidate.save(user=actor, update_fields=updates)

        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)

        if candidate.admissible and (candidate.compte_utilisateur_id or candidate.email):
            CandidateAccountService.promote_to_stagiaire(candidate, actor=actor)

        return candidate

    @classmethod
    @transaction.atomic
    def cancel_start_formation(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Annule une entrée en formation lorsqu'elle a été enregistrée par erreur.
        """
        was_counted = cls._counts_in_formation_inscrits(candidate)
        updates = []

        target_phase = cls._target_phase_without_live_training(candidate)
        if candidate.parcours_phase != target_phase:
            candidate.parcours_phase = target_phase
            updates.append("parcours_phase")

        if candidate.date_entree_formation_effective is not None:
            candidate.date_entree_formation_effective = None
            updates.append("date_entree_formation_effective")

        if candidate.date_sortie_formation is not None:
            candidate.date_sortie_formation = None
            updates.append("date_sortie_formation")

        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")

        if updates:
            candidate.save(user=actor, update_fields=updates)

        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)
        return candidate

    @classmethod
    @transaction.atomic
    def complete_formation(cls, candidate: Candidat, actor=None) -> Candidat:
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

        was_counted = cls._counts_in_formation_inscrits(candidate)
        now = timezone.now()
        updates = []

        if candidate.parcours_phase != Candidat.ParcoursPhase.SORTI:
            candidate.parcours_phase = Candidat.ParcoursPhase.SORTI
            updates.append("parcours_phase")

        if candidate.date_validation_inscription is None:
            candidate.date_validation_inscription = now
            updates.append("date_validation_inscription")

        if candidate.date_entree_formation_effective is None:
            candidate.date_entree_formation_effective = now
            updates.append("date_entree_formation_effective")

        if candidate.date_sortie_formation is None:
            candidate.date_sortie_formation = now
            updates.append("date_sortie_formation")

        if updates:
            candidate.save(user=actor, update_fields=updates)

        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)

        return candidate

    @classmethod
    @transaction.atomic
    def mark_gespers(cls, candidate: Candidat, actor=None) -> Candidat:
        """Marque manuellement le candidat comme inscrit GESPERS."""
        was_counted = cls._counts_in_formation_inscrits(candidate)
        updates = []
        if not candidate.inscrit_gespers:
            candidate.inscrit_gespers = True
            updates.append("inscrit_gespers")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)
        return candidate

    @classmethod
    @transaction.atomic
    def clear_gespers(cls, candidate: Candidat, actor=None) -> Candidat:
        """Annule manuellement l'inscription GESPERS du candidat."""
        was_counted = cls._counts_in_formation_inscrits(candidate)
        updates = []
        if candidate.inscrit_gespers:
            candidate.inscrit_gespers = False
            updates.append("inscrit_gespers")
        if candidate.parcours_phase == Candidat.ParcoursPhase.INSCRIT_VALIDE and not candidate.date_validation_inscription:
            candidate.parcours_phase = Candidat.ParcoursPhase.POSTULANT
            updates.append("parcours_phase")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        cls._sync_formation_inscrits_from_transition(candidate, was_counted=was_counted, actor=actor)
        return candidate

    @classmethod
    @transaction.atomic
    def set_accompagnement(cls, candidate: Candidat, actor=None) -> Candidat:
        """Active manuellement l'accompagnement TRE sans écraser l'appairage éventuel."""
        updates = []
        if not candidate.en_accompagnement_tre:
            candidate.en_accompagnement_tre = True
            updates.append("en_accompagnement_tre")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def clear_accompagnement(cls, candidate: Candidat, actor=None) -> Candidat:
        """Retire l'accompagnement TRE manuel."""
        updates = []
        if candidate.en_accompagnement_tre:
            candidate.en_accompagnement_tre = False
            updates.append("en_accompagnement_tre")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def set_appairage(cls, candidate: Candidat, actor=None) -> Candidat:
        """Active manuellement l'appairage sans effacer l'accompagnement TRE."""
        updates = []
        if not candidate.en_appairage:
            candidate.en_appairage = True
            updates.append("en_appairage")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def clear_appairage(cls, candidate: Candidat, actor=None) -> Candidat:
        """Retire l'appairage manuel."""
        updates = []
        if candidate.en_appairage:
            candidate.en_appairage = False
            updates.append("en_appairage")
        legacy_status = cls._sync_legacy_status_from_manual_flags(candidate)
        if candidate.statut != legacy_status:
            candidate.statut = legacy_status
            updates.append("statut")
        if updates:
            candidate.save(user=actor, update_fields=updates)
        return candidate

    @classmethod
    @transaction.atomic
    def abandon(cls, candidate: Candidat, actor=None) -> Candidat:
        now = timezone.now()
        updates = []

        if candidate.parcours_phase != Candidat.ParcoursPhase.ABANDON:
            candidate.parcours_phase = Candidat.ParcoursPhase.ABANDON
            updates.append("parcours_phase")

        # Compatibilité descendante : le statut legacy doit rester cohérent
        # pour les écrans/outils qui ne lisent pas encore `parcours_phase`.
        if candidate.statut != Candidat.StatutCandidat.ABANDON:
            candidate.statut = Candidat.StatutCandidat.ABANDON
            updates.append("statut")

        if candidate.date_sortie_formation is None:
            candidate.date_sortie_formation = now
            updates.append("date_sortie_formation")

        if updates:
            candidate.save(user=actor, update_fields=updates)

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)

        return candidate
