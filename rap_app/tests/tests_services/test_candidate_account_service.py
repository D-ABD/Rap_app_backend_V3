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
from rap_app.services.candidate_account_service import CandidateAccountService
from rap_app.tests.factories import UserFactory


class CandidateAccountServiceTests(TestCase):
    def setUp(self):
        self.actor = UserFactory(role=CustomUser.ROLE_STAFF)
        self.centre = Centre.objects.create(nom="Centre Account")
        self.actor.centres.add(self.centre)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Account",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=30),
        )

    def test_provision_candidate_account_rejects_email_already_linked_to_other_candidate(self):
        existing_user = CustomUser.objects.create_user_with_role(
            email="collision@example.com",
            username="collision_user",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT,
        )
        Candidat.objects.create(
            nom="Premier",
            prenom="Candidat",
            email="collision@example.com",
            formation=self.formation,
            compte_utilisateur=existing_user,
            created_by=self.actor,
            updated_by=self.actor,
        )

        candidate = Candidat.objects.create(
            nom="Second",
            prenom="Candidat",
            email="collision@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        with self.assertRaises(ValidationError):
            CandidateAccountService.provision_candidate_account(candidate, actor=self.actor)

    def test_request_account_marks_candidate_pending(self):
        candidate = Candidat.objects.create(
            nom="Pending",
            prenom="Candidate",
            email="pending@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateAccountService.request_account(candidate, requester=self.actor)

        candidate.refresh_from_db()
        self.assertEqual(candidate.demande_compte_statut, Candidat.DemandeCompteStatut.EN_ATTENTE)
        self.assertIsNotNone(candidate.demande_compte_date)
        self.assertIsNone(candidate.demande_compte_traitee_par)
        self.assertIsNone(candidate.demande_compte_traitee_le)

    def test_approve_account_request_creates_user_and_marks_candidate_accepted(self):
        candidate = Candidat.objects.create(
            nom="Approved",
            prenom="Candidate",
            email="approved@example.com",
            formation=self.formation,
            demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
            created_by=self.actor,
            updated_by=self.actor,
        )

        user = CandidateAccountService.approve_account_request(candidate, actor=self.actor)

        candidate.refresh_from_db()
        self.assertIsNotNone(user)
        self.assertEqual(candidate.compte_utilisateur_id, user.id)
        self.assertEqual(candidate.demande_compte_statut, Candidat.DemandeCompteStatut.ACCEPTEE)
        self.assertEqual(candidate.demande_compte_traitee_par_id, self.actor.id)
        self.assertIsNotNone(candidate.demande_compte_traitee_le)

    def test_request_account_rejects_duplicate_pending_request(self):
        candidate = Candidat.objects.create(
            nom="PendingTwice",
            prenom="Candidate",
            email="pending-twice@example.com",
            formation=self.formation,
            demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
            created_by=self.actor,
            updated_by=self.actor,
        )

        with self.assertRaises(ValidationError):
            CandidateAccountService.request_account(candidate, requester=self.actor)

    def test_reject_account_request_marks_candidate_refused(self):
        candidate = Candidat.objects.create(
            nom="Rejected",
            prenom="Candidate",
            email="rejected@example.com",
            formation=self.formation,
            demande_compte_statut=Candidat.DemandeCompteStatut.EN_ATTENTE,
            created_by=self.actor,
            updated_by=self.actor,
        )

        CandidateAccountService.reject_account_request(candidate, actor=self.actor)

        candidate.refresh_from_db()
        self.assertEqual(candidate.demande_compte_statut, Candidat.DemandeCompteStatut.REFUSEE)
        self.assertEqual(candidate.demande_compte_traitee_par_id, self.actor.id)
        self.assertIsNotNone(candidate.demande_compte_traitee_le)
