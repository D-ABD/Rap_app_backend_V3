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
    - l'étape structurée précédant l'entrée en formation correspond à
      l'inscription GESPERS ;
    - l'entrée en formation et l'abandon restent des transitions pilotées par
      le backend ;
    - les statuts legacy manuels comme `en accompagnement` ou `en appairage`
      ne sont pas écrasés automatiquement ici, sauf pour les transitions
      structurées nécessaires à la compatibilité descendante.
    """

    @classmethod
    @transaction.atomic
    def validate_inscription(cls, candidate: Candidat, actor=None) -> Candidat:
        """
        Positionne le candidat sur l'étape structurée "Inscrit GESPERS",
        dernière marche avant l'entrée en formation.
        """
        if not candidate.formation_id:
            raise ValidationError({"formation": ["Le candidat doit être affecté à une formation."]})

        now = timezone.now()
        updates = []

        if candidate.parcours_phase != Candidat.ParcoursPhase.INSCRIT_VALIDE:
            candidate.parcours_phase = Candidat.ParcoursPhase.INSCRIT_VALIDE
            updates.append("parcours_phase")

        if not candidate.inscrit_gespers:
            candidate.inscrit_gespers = True
            updates.append("inscrit_gespers")

        if candidate.statut != Candidat.StatutCandidat.EN_ATTENTE_RENTREE:
            candidate.statut = Candidat.StatutCandidat.EN_ATTENTE_RENTREE
            updates.append("statut")

        if candidate.date_validation_inscription is None:
            candidate.date_validation_inscription = now
            updates.append("date_validation_inscription")

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

        return candidate
