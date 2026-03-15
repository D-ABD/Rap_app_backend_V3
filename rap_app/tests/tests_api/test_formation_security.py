from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.centres import Centre
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class FormationSecurityTests(APITestCase):
    def _create_formation(self, centre, nom="Formation Test"):
        today = timezone.localdate()

        type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)

        statut = Statut.objects.create(nom=Statut.NON_DEFINI)

        return Formation.objects.create(
            nom=nom,
            centre=centre,
            type_offre=type_offre,
            statut=statut,
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=30),
        )

    def test_formation_retrieve_outside_centre_forbidden(self):
        centre_a = Centre.objects.create(nom="Centre A")
        centre_b = Centre.objects.create(nom="Centre B")

        user = UserFactory(role="staff")
        user.centres.add(centre_a)

        formation = self._create_formation(centre_b, nom="Formation B")

        self.client.force_authenticate(user=user)

        url = f"/api/formations/{formation.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_formation_retrieve_same_centre_allowed(self):
        centre = Centre.objects.create(nom="Centre A")

        user = UserFactory(role="staff")
        user.centres.add(centre)

        formation = self._create_formation(centre, nom="Formation A")

        self.client.force_authenticate(user=user)

        url = f"/api/formations/{formation.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_formation_archiver_outside_centre_forbidden(self):
        centre_a = Centre.objects.create(nom="Centre A")
        centre_b = Centre.objects.create(nom="Centre B")

        user = UserFactory(role="staff")
        user.centres.add(centre_a)

        formation = self._create_formation(centre_b, nom="Formation B")

        self.client.force_authenticate(user=user)

        url = f"/api/formations/{formation.id}/archiver/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_read_cannot_archive_formation(self):
        centre = Centre.objects.create(nom="Centre A")

        user = UserFactory(role="staff_read")
        user.centres.add(centre)

        formation = self._create_formation(centre, nom="Formation A")

        self.client.force_authenticate(user=user)

        url = f"/api/formations/{formation.id}/archiver/"
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_dans_filter_stays_scoped_to_user_centres(self):
        centre_a = Centre.objects.create(nom="Centre A")
        centre_b = Centre.objects.create(nom="Centre B")

        user = UserFactory(role="staff")
        user.centres.add(centre_a)

        formation_visible = self._create_formation(centre_a, nom="Formation Visible")
        formation_hidden = self._create_formation(centre_b, nom="Formation Cachée")

        self.client.force_authenticate(user=user)

        response = self.client.get("/api/formations/?dans=4w")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]

        self.assertIn(formation_visible.id, returned_ids)
        self.assertNotIn(formation_hidden.id, returned_ids)


from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from rap_app.models.centres import Centre
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


@pytest.mark.django_db
def test_export_xlsx_respects_centre_scope():

    client = APIClient()

    centre_a = Centre.objects.create(nom="Centre A")
    centre_b = Centre.objects.create(nom="Centre B")

    user = UserFactory(role="staff")
    user.centres.add(centre_a)

    type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
    statut = Statut.objects.create(nom=Statut.NON_DEFINI)

    today = timezone.localdate()

    formation_visible = Formation.objects.create(
        nom="Formation Visible",
        centre=centre_a,
        type_offre=type_offre,
        statut=statut,
        start_date=today + timedelta(days=5),
        end_date=today + timedelta(days=30),
    )

    formation_cachee = Formation.objects.create(
        nom="Formation Cachee",
        centre=centre_b,
        type_offre=type_offre,
        statut=statut,
        start_date=today + timedelta(days=5),
        end_date=today + timedelta(days=30),
    )

    client.force_authenticate(user=user)

    response = client.get("/api/formations/export-xlsx/")

    assert response.status_code == 200

    # Vérifie que c'est bien un Excel
    assert response["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    content = response.content.decode(errors="ignore")

    # La formation du centre visible doit apparaître
    assert "Formation Visible" in content

    # La formation d'un autre centre ne doit PAS apparaître
    assert "Formation Cachee" not in content
