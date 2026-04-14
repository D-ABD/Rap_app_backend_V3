"""Tests relatifs a candidate lifecycle service."""
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.services.candidate_lifecycle_service import CandidateLifecycleService
from rap_app.tests.factories import UserFactory


class CandidateLifecycleServiceTests(TestCase):
    """Cas de test pour Candidate Lifecycle Service Tests."""
    def setUp(self):
        self.actor = UserFactory(role=CustomUser.ROLE_STAFF)
        self.centre = Centre.objects.create(nom="Centre Lifecycle", code_postal="75040")
        self.actor.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Lifecycle",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=30),
        )

    def test_validate_inscription_requires_formation(self):
        candidate = Candidat.objects.create(
            nom="Sans",
            prenom="Formation",
            email="sans.formation@example.com",
            created_by=self.actor,
            updated_by=self.actor,
        )

        with self.assertRaises(ValidationError):
            CandidateLifecycleService.validate_inscription(candidate, actor=self.actor)

    def test_validate_inscription_sets_phase_and_timestamp_without_forcing_gespers(self):
        candidate = Candidat.objects.create(
            nom="Inscription",
            prenom="Ok",
            email="inscription.ok@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.validate_inscription(candidate, actor=self.actor)

        candidate.refresh_from_db()
        self.assertEqual(candidate.parcours_phase, Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertFalse(candidate.inscrit_gespers)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.AUTRE)
        self.assertIsNotNone(candidate.date_validation_inscription)

    def test_start_formation_sets_phase_and_promotes_stagiaire_when_possible(self):
        user = CustomUser.objects.create_user_with_role(
            email="start.lifecycle@example.com",
            username="start_lifecycle",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT,
        )
        candidate = Candidat.objects.create(
            nom="Start",
            prenom="Formation",
            email="start.lifecycle@example.com",
            formation=self.formation,
            admissible=True,
            compte_utilisateur=user,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.start_formation(candidate, actor=self.actor)

        candidate.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(candidate.parcours_phase, Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION)
        self.assertIsNotNone(candidate.date_validation_inscription)
        self.assertIsNotNone(candidate.date_entree_formation_effective)
        self.assertEqual(user.role, CustomUser.ROLE_STAGIAIRE)

    def test_cancel_start_formation_reverts_candidate_to_pre_training_state(self):
        user = CustomUser.objects.create_user_with_role(
            email="cancel.lifecycle@example.com",
            username="cancel_lifecycle",
            password="password123",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        candidate = Candidat.objects.create(
            nom="Cancel",
            prenom="Formation",
            email="cancel.lifecycle@example.com",
            formation=self.formation,
            admissible=True,
            inscrit_gespers=True,
            compte_utilisateur=user,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
            date_validation_inscription=timezone.now(),
            date_entree_formation_effective=timezone.now(),
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.cancel_start_formation(candidate, actor=self.actor)

        candidate.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(candidate.parcours_phase, Candidat.ParcoursPhase.INSCRIT_VALIDE)
        self.assertIsNone(candidate.date_entree_formation_effective)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.AUTRE)
        self.assertEqual(user.role, CustomUser.ROLE_CANDIDAT_USER)

    def test_complete_formation_sets_sortie_and_reverts_stagiaire_role(self):
        user = CustomUser.objects.create_user_with_role(
            email="complete.lifecycle@example.com",
            username="complete_lifecycle",
            password="password123",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        candidate = Candidat.objects.create(
            nom="Complete",
            prenom="Formation",
            email="complete.lifecycle@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
            compte_utilisateur=user,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.complete_formation(candidate, actor=self.actor)

        candidate.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(candidate.parcours_phase, Candidat.ParcoursPhase.SORTI)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.EN_FORMATION)
        self.assertIsNotNone(candidate.date_sortie_formation)
        self.assertEqual(user.role, CustomUser.ROLE_CANDIDAT_USER)

    def test_abandon_sets_new_phase_and_reverts_stagiaire_role(self):
        user = CustomUser.objects.create_user_with_role(
            email="abandon.lifecycle@example.com",
            username="abandon_lifecycle",
            password="password123",
            role=CustomUser.ROLE_STAGIAIRE,
        )
        candidate = Candidat.objects.create(
            nom="Abandon",
            prenom="Lifecycle",
            email="abandon.lifecycle@example.com",
            formation=self.formation,
            statut=Candidat.StatutCandidat.EN_FORMATION,
            compte_utilisateur=user,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.abandon(candidate, actor=self.actor)

        candidate.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(candidate.parcours_phase, Candidat.ParcoursPhase.ABANDON)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.ABANDON)
        self.assertIsNotNone(candidate.date_sortie_formation)
        self.assertEqual(user.role, CustomUser.ROLE_CANDIDAT_USER)

    def test_manual_flags_are_cumulative_and_sync_legacy_status(self):
        candidate = Candidat.objects.create(
            nom="Manual",
            prenom="Flags",
            email="manual.flags@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.set_accompagnement(candidate, actor=self.actor)
        candidate.refresh_from_db()
        self.assertTrue(candidate.en_accompagnement_tre)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.EN_ACCOMPAGNEMENT)

        CandidateLifecycleService.set_appairage(candidate, actor=self.actor)
        candidate.refresh_from_db()
        self.assertTrue(candidate.en_accompagnement_tre)
        self.assertTrue(candidate.en_appairage)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.EN_APPAIRAGE)

        CandidateLifecycleService.clear_appairage(candidate, actor=self.actor)
        candidate.refresh_from_db()
        self.assertFalse(candidate.en_appairage)
        self.assertTrue(candidate.en_accompagnement_tre)
        self.assertEqual(candidate.statut, Candidat.StatutCandidat.EN_ACCOMPAGNEMENT)

    def test_mark_gespers_does_not_increment_counter_for_postulant(self):
        """Lot 8 — Un candidat POSTULANT marqué GESPERS ne doit PAS
        incrémenter inscrits_crif (GESPERS découplé des compteurs saisie)."""
        candidate = Candidat.objects.create(
            nom="Gespers",
            prenom="Crif",
            email="gespers.crif@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.mark_gespers(candidate, actor=self.actor)

        candidate.refresh_from_db()
        self.formation.refresh_from_db()
        self.assertTrue(candidate.inscrit_gespers)
        self.assertEqual(self.formation.inscrits_crif, 0)
        self.assertEqual(self.formation.inscrits_mp, 0)

    def test_clear_gespers_does_not_decrement_counter_for_postulant(self):
        """Lot 8 — Un candidat POSTULANT avec clear-gespers ne doit PAS
        décrémenter le compteur (GESPERS découplé)."""
        candidate = Candidat.objects.create(
            nom="Gespers",
            prenom="Reset",
            email="gespers.reset@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.formation.inscrits_crif = 1
        self.formation.save(user=self.actor, update_fields=["inscrits_crif"])

        CandidateLifecycleService.clear_gespers(candidate, actor=self.actor)

        candidate.refresh_from_db()
        self.formation.refresh_from_db()
        self.assertFalse(candidate.inscrit_gespers)
        self.assertEqual(self.formation.inscrits_crif, 1)

    def test_mark_gespers_does_not_increment_mp_for_postulant_non_crif(self):
        """Lot 8 — Idem pour formation MP : GESPERS seul ne compte pas."""
        type_offre_mp = TypeOffre.objects.create(nom=TypeOffre.POEI)
        formation_mp = Formation.objects.create(
            nom="Formation MP Lifecycle",
            centre=self.centre,
            type_offre=type_offre_mp,
            statut=self.statut,
            start_date=timezone.localdate() + timedelta(days=5),
            end_date=timezone.localdate() + timedelta(days=30),
        )
        candidate = Candidat.objects.create(
            nom="Gespers",
            prenom="Mp",
            email="gespers.mp@example.com",
            formation=formation_mp,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateLifecycleService.mark_gespers(candidate, actor=self.actor)

        formation_mp.refresh_from_db()
        self.assertEqual(formation_mp.inscrits_crif, 0)
        self.assertEqual(formation_mp.inscrits_mp, 0)

    def test_mark_gespers_does_not_double_count_already_validated_candidate(self):
        candidate = Candidat.objects.create(
            nom="Gespers",
            prenom="Validated",
            email="gespers.validated@example.com",
            formation=self.formation,
            date_validation_inscription=timezone.now(),
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.formation.inscrits_crif = 1
        self.formation.save(user=self.actor, update_fields=["inscrits_crif"])

        CandidateLifecycleService.mark_gespers(candidate, actor=self.actor)

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 1)

    def test_clear_gespers_keeps_count_when_candidate_stays_validated(self):
        candidate = Candidat.objects.create(
            nom="Gespers",
            prenom="StillValidated",
            email="gespers.still.validated@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            date_validation_inscription=timezone.now(),
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.formation.inscrits_crif = 1
        self.formation.save(user=self.actor, update_fields=["inscrits_crif"])

        CandidateLifecycleService.clear_gespers(candidate, actor=self.actor)

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 1)

    # ================================================================
    # Lot 8 — Tests de découplage GESPERS / compteurs saisie
    # ================================================================

    def test_lot8_gespers_only_postulant_not_counted(self):
        """Un candidat POSTULANT avec uniquement inscrit_gespers=True
        ne doit PAS être compté dans inscrits_crif."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="GespersOnly",
            email="lot8.gespers.only@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertFalse(counted)

    def test_lot8_validated_without_gespers_still_counted(self):
        """Un candidat avec date_validation_inscription est compté
        même sans inscrit_gespers."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="ValidatedNoGespers",
            email="lot8.validated.nogespers@example.com",
            formation=self.formation,
            date_validation_inscription=timezone.now(),
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertTrue(counted)

    def test_lot8_stagiaire_with_gespers_still_counted(self):
        """Un stagiaire en formation reste compté (via phase),
        indépendamment de inscrit_gespers."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="StagiaireGespers",
            email="lot8.stagiaire.gespers@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            parcours_phase=Candidat.ParcoursPhase.STAGIAIRE_EN_FORMATION,
            date_validation_inscription=timezone.now(),
            date_entree_formation_effective=timezone.now(),
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertTrue(counted)

    def test_lot8_sorti_without_gespers_counted(self):
        """Un candidat SORTI reste compté même sans GESPERS."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="SortiNoGespers",
            email="lot8.sorti.nogespers@example.com",
            formation=self.formation,
            parcours_phase=Candidat.ParcoursPhase.SORTI,
            date_validation_inscription=timezone.now(),
            date_sortie_formation=timezone.now(),
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertTrue(counted)

    def test_lot8_mark_gespers_on_validated_does_not_double_count(self):
        """mark_gespers sur un candidat déjà INSCRIT_VALIDE ne doit
        pas incrémenter le compteur (déjà compté par phase)."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="MarkOnValidated",
            email="lot8.mark.validated@example.com",
            formation=self.formation,
            date_validation_inscription=timezone.now(),
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.formation.inscrits_crif = 1
        self.formation.save(user=self.actor, update_fields=["inscrits_crif"])

        CandidateLifecycleService.mark_gespers(candidate, actor=self.actor)

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 1)

    def test_lot8_clear_gespers_on_validated_keeps_count(self):
        """clear_gespers sur un candidat INSCRIT_VALIDE avec
        date_validation_inscription ne doit PAS décrémenter."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="ClearOnValidated",
            email="lot8.clear.validated@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            date_validation_inscription=timezone.now(),
            parcours_phase=Candidat.ParcoursPhase.INSCRIT_VALIDE,
            created_by=self.actor,
            updated_by=self.actor,
        )
        self.formation.inscrits_crif = 1
        self.formation.save(user=self.actor, update_fields=["inscrits_crif"])

        CandidateLifecycleService.clear_gespers(candidate, actor=self.actor)

        self.formation.refresh_from_db()
        self.assertEqual(self.formation.inscrits_crif, 1)

    def test_lot8_no_formation_never_counted(self):
        """Un candidat sans formation n'est jamais compté,
        quels que soient ses flags."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="NoFormation",
            email="lot8.no.formation@example.com",
            inscrit_gespers=True,
            date_validation_inscription=timezone.now(),
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertFalse(counted)

    def test_lot8_date_entree_effective_alone_is_counted(self):
        """date_entree_formation_effective seule suffit pour être compté."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="EntreeEffective",
            email="lot8.entree.effective@example.com",
            formation=self.formation,
            date_entree_formation_effective=timezone.now(),
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertTrue(counted)

    def test_lot8_abandon_with_gespers_only_not_counted(self):
        """Un candidat en phase ABANDON avec uniquement inscrit_gespers
        n'est PAS compté (ABANDON n'est pas dans les phases comptées,
        et GESPERS seul ne suffit plus)."""
        candidate = Candidat.objects.create(
            nom="L8",
            prenom="AbandonGespers",
            email="lot8.abandon.gespers@example.com",
            formation=self.formation,
            inscrit_gespers=True,
            parcours_phase=Candidat.ParcoursPhase.ABANDON,
            created_by=self.actor,
            updated_by=self.actor,
        )
        counted = CandidateLifecycleService._counts_in_formation_inscrits(candidate)
        self.assertFalse(counted)
