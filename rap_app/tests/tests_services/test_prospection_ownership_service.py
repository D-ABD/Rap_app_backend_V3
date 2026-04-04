"""Tests relatifs a prospection ownership service."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.prospection import Prospection
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.services.prospection_ownership_service import ProspectionOwnershipService


class ProspectionOwnershipServiceTests(TestCase):
    """Cas de test pour Prospection Ownership Service Tests."""
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
        Candidat.objects.create(
            nom="Service",
            prenom="Candidate",
            email="prosp-service@example.com",
            formation=self.formation,
            compte_utilisateur=self.user,
        )

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

    def test_staff_resolution_defaults_owner_to_actor_and_uses_payload_formation(self):
        staff = CustomUser.objects.create_user_with_role(
            email="staff-prosp@example.com",
            username="staff_prosp",
            password="password123",
            role=CustomUser.ROLE_STAFF,
        )

        resolved = ProspectionOwnershipService.resolve_and_sync_ownership(
            actor=staff,
            validated_data={
                "partenaire": self.partenaire,
                "formation": self.formation,
            },
        )

        self.assertEqual(resolved["owner"], staff)
        self.assertEqual(resolved["formation"], self.formation)
        self.assertEqual(resolved["centre_id"], self.formation.centre_id)

    def test_staff_resolution_prioritizes_owner_candidate_formation_over_payload(self):
        other_centre = Centre.objects.create(nom="Centre Prospection Service 2", code_postal="69000")
        other_formation = Formation.objects.create(
            nom="Formation Prospection Service 2",
            centre=other_centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=timezone.localdate() + timedelta(days=3),
            end_date=timezone.localdate() + timedelta(days=40),
        )
        staff = CustomUser.objects.create_user_with_role(
            email="staff-priority@example.com",
            username="staff_priority",
            password="password123",
            role=CustomUser.ROLE_STAFF,
        )

        resolved = ProspectionOwnershipService.resolve_and_sync_ownership(
            actor=staff,
            validated_data={
                "owner": self.user,
                "formation": other_formation,
            },
        )

        self.assertEqual(resolved["owner"], self.user)
        self.assertEqual(resolved["formation"], self.formation)
        self.assertEqual(resolved["centre_id"], self.formation.centre_id)

    def test_centre_falls_back_to_partner_default_centre_when_no_formation(self):
        default_centre = Centre.objects.create(nom="Centre Partenaire Default", code_postal="13000")
        partenaire = Partenaire.objects.create(nom="Entreprise Default Centre", default_centre=default_centre)
        staff = CustomUser.objects.create_user_with_role(
            email="staff-centre@example.com",
            username="staff_centre",
            password="password123",
            role=CustomUser.ROLE_STAFF,
        )

        resolved = ProspectionOwnershipService.resolve_and_sync_ownership(
            actor=staff,
            validated_data={"partenaire": partenaire},
            instance=Prospection(partenaire=partenaire),
        )

        self.assertEqual(resolved["owner"], staff)
        self.assertIsNone(resolved["formation"])
        self.assertEqual(resolved["centre_id"], default_centre.id)
