"""Tests relatifs a candidate account service."""
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from rap_app.api.candidat_error_messages import (
    CANDIDAT_ACCOUNT_AUCUN_COMPTE_LIE,
    CANDIDAT_ACCOUNT_DEMANDE_DEJA_EN_ATTENTE,
)
from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.services.candidate_account_service import CandidateAccountService
from rap_app.tests.factories import UserFactory


class CandidateAccountServiceTests(TestCase):
    """Cas de test pour Candidate Account Service Tests."""
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

        try:
            CandidateAccountService.request_account(candidate, requester=self.actor)
        except ValidationError as exc:
            self.assertIn("non_field_errors", exc.message_dict)
            self.assertEqual(
                exc.message_dict["non_field_errors"],
                [CANDIDAT_ACCOUNT_DEMANDE_DEJA_EN_ATTENTE],
            )

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

    def test_detach_compte_clears_link_and_leaves_user(self):
        u = CustomUser.objects.create_user_with_role(
            email="detach@example.com",
            username="detach_user",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT_USER,
        )
        candidate = Candidat.objects.create(
            nom="Detach",
            prenom="Candidate",
            email="detach@example.com",
            formation=self.formation,
            compte_utilisateur=u,
            created_by=self.actor,
            updated_by=self.actor,
        )

        c2, unlinked = CandidateAccountService.detach_compte_from_candidate(candidate, actor=self.actor)
        self.assertEqual(unlinked, u.id)
        c2.refresh_from_db()
        u.refresh_from_db()
        self.assertIsNone(c2.compte_utilisateur_id)
        self.assertTrue(CustomUser.objects.filter(pk=u.id).exists())

    def test_detach_compte_rejects_without_link(self):
        candidate = Candidat.objects.create(
            nom="NoLink",
            prenom="Candidate",
            email="nolink@example.com",
            formation=self.formation,
            created_by=self.actor,
            updated_by=self.actor,
        )
        with self.assertRaises(ValidationError) as ctx:
            CandidateAccountService.detach_compte_from_candidate(candidate, actor=self.actor)
        self.assertEqual(
            ctx.exception.message_dict.get("non_field_errors"),
            [CANDIDAT_ACCOUNT_AUCUN_COMPTE_LIE],
        )
