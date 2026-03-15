import datetime
from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.evenements import Evenement
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class EvenementViewSetTest(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre Test", code_postal="75001")
        self.statut = Statut.objects.create(nom="non_defini", couleur="#00FF00")
        self.type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")

        self.formation = Formation.objects.create(
            nom="Formation Test",
            centre=self.centre,
            statut=self.statut,
            type_offre=self.type_offre,
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=10),
            prevus_crif=10,
            prevus_mp=5,
            inscrits_crif=3,
            inscrits_mp=2,
            created_by=self.user,
        )

        self.evenement = Evenement.objects.create(
            formation=self.formation,
            type_evenement=Evenement.TypeEvenement.FORUM,
            event_date=timezone.now().date() + timedelta(days=5),
            lieu="Test City",
            participants_prevus=20,
            participants_reels=15,
            created_by=self.user,
        )

    def test_lister_evenements(self):
        url = reverse("evenement-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(isinstance(response.data, list) or "results" in response.data or "data" in response.data)

    def test_details_evenement(self):
        url = reverse("evenement-detail", args=[self.evenement.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", response.data)
        self.assertEqual(data["id"], self.evenement.id)

    def test_creation_evenement_autre_sans_description(self):
        url = reverse("evenement-list")
        payload = {
            "formation_id": self.formation.id,
            "type_evenement": "autre",
            "event_date": timezone.now().date().isoformat(),
            "lieu": "Paris",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description_autre", response.data)

    def test_export_csv_evenements(self):
        url = reverse("evenement-export-csv")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")

    def test_stats_par_type(self):
        url = reverse("evenement-stats-par-type")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        self.assertIn("forum", response.data["data"])
