"""Tests relatifs a lot5 formation filters."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.centres import Centre
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class Lot5FormationFilterTests(APITestCase):
    """Cas de test pour Lot5 Formation Filter Tests."""
    def setUp(self):
        self.centre = Centre.objects.create(nom="Centre Lot5")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        self.user = UserFactory(role="staff")
        self.user.centres.add(self.centre)

    def _create_formation(self, nom, prevus_crif, prevus_mp, inscrits_crif, inscrits_mp):
        today = timezone.localdate()
        return Formation.objects.create(
            nom=nom,
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today,
            end_date=today + timedelta(days=30),
            prevus_crif=prevus_crif,
            prevus_mp=prevus_mp,
            inscrits_crif=inscrits_crif,
            inscrits_mp=inscrits_mp,
        )

    def test_list_places_disponibles_uses_orm_filter_and_keeps_only_open_formations(self):
        visible = self._create_formation("Formation ouverte", 10, 0, 4, 0)
        self._create_formation("Formation pleine", 5, 0, 5, 0)

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/formations/?places_disponibles=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]

        self.assertIn(visible.id, returned_ids)
        self.assertEqual(len(returned_ids), 1)
