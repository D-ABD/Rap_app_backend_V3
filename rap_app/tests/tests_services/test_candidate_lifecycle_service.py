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
