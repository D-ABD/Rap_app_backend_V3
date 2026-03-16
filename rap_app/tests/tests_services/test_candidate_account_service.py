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
        existing_candidate = existing_user.candidat_associe
        existing_candidate.nom = "Premier"
        existing_candidate.prenom = "Candidat"
        existing_candidate.email = "collision@example.com"
        existing_candidate.formation = self.formation
        existing_candidate.created_by = self.actor
        existing_candidate.updated_by = self.actor
        existing_candidate.save()

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
