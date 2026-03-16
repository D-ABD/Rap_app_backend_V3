from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.services.prospection_ownership_service import ProspectionOwnershipService


class ProspectionOwnershipServiceTests(TestCase):
    def setUp(self):
        self.centre = Centre.objects.create(nom="Centre Prospection Service", code_postal="75000")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Prospection Service",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=30),
        )
        self.partenaire = Partenaire.objects.create(nom="Entreprise Service")
        self.user = CustomUser.objects.create_user_with_role(
            email="prosp-service@example.com",
            username="prosp_service",
            password="password123",
            role=CustomUser.ROLE_CANDIDAT,
        )
        candidat = self.user.candidat_associe
        candidat.nom = "Service"
        candidat.prenom = "Candidate"
        candidat.email = "prosp-service@example.com"
        candidat.formation = self.formation
        candidat.save()

    def test_candidate_resolution_forces_owner_formation_and_centre(self):
        resolved = ProspectionOwnershipService.resolve_and_sync_ownership(
            actor=self.user,
            validated_data={
                "partenaire": self.partenaire,
            },
        )

        self.assertEqual(resolved["owner"], self.user)
        self.assertEqual(resolved["formation"], self.formation)
        self.assertEqual(resolved["centre_id"], self.formation.centre_id)
