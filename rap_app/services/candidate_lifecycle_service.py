from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from ..models.candidat import Candidat
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
    @transaction.atomic
    def validate_inscription(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Valide l'entrée dans le parcours de recrutement sans forcer
        l'inscription GESPERS, qui reste une décision manuelle.
        """
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

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

        if candidate.admissible and (candidate.compte_utilisateur_id or candidate.email):
            CandidateAccountService.promote_to_stagiaire(candidate, actor=actor)

        return candidate

    @classmethod
    @transaction.atomic
    def cancel_start_formation(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Annule une entrée en formation lorsqu'elle a été enregistrée par erreur.
        """
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

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)
        return candidate

    @classmethod
    @transaction.atomic
    def complete_formation(cls, candidate: Candidat, actor=None) -> Candidat:
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

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

        CandidateAccountService.revert_to_candidate_user(candidate, actor=actor)

        return candidate

    @classmethod
    @transaction.atomic
    def mark_gespers(cls, candidate: Candidat, actor=None) -> Candidat:
        """Marque manuellement le candidat comme inscrit GESPERS."""
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
        return candidate

    @classmethod
    @transaction.atomic
    def clear_gespers(cls, candidate: Candidat, actor=None) -> Candidat:
        """Annule manuellement l'inscription GESPERS du candidat."""
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
