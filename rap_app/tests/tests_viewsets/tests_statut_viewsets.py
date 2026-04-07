"""Tests relatifs a statut viewsets."""
from django.urls import reverse
from rest_framework import status

from ...models.custom_user import CustomUser
from ...models.statut import Statut
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class StatutViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Statut View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("statut-list")

    def test_create_statut_success(self):
        data = {"nom": Statut.PLEINE, "couleur": "#123456"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["nom"], Statut.PLEINE)

    def test_create_statut_autre_without_description(self):
        data = {"nom": Statut.AUTRE, "couleur": "#FF0000"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("description_autre", response.data.get("errors", {}))

    def test_create_statut_invalid_color(self):
        data = {"nom": Statut.PLEINE, "couleur": "bleu"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("couleur", response.data.get("errors", {}))

    def test_list_statuts(self):
        Statut.objects.create(nom=Statut.PLEINE, couleur="#111111")
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", response.data)
        self.assertTrue(
            isinstance(data, list)
            or "results" in response.data
            or (isinstance(data, dict) and "results" in data)
        )

    def test_retrieve_statut(self):
        statut = Statut.objects.create(nom=Statut.QUASI_PLEINE, couleur="#333333")
        url = reverse("statut-detail", args=[statut.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", response.data)
        self.assertEqual(data["nom"], Statut.QUASI_PLEINE)

    def test_update_statut(self):
        statut = Statut.objects.create(nom=Statut.RECRUTEMENT_EN_COURS, couleur="#222222")
        url = reverse("statut-detail", args=[statut.id])
        payload = {"nom": Statut.FORMATION_EN_COURS, "couleur": "#00FF00"}
        response = self.client.put(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resp_data = response.data.get("data", response.data)
        self.assertEqual(resp_data["couleur"], "#00FF00")

    def test_partial_update_statut(self):
        statut = Statut.objects.create(nom=Statut.RECRUTEMENT_EN_COURS, couleur="#ABCDEF")
        url = reverse("statut-detail", args=[statut.id])
        payload = {"couleur": "#123ABC"}
        response = self.client.patch(url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        resp_data = response.data.get("data", response.data)
        self.assertEqual(resp_data["couleur"], "#123ABC")

    def test_delete_statut_archives_instance(self):
        statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#999999")
        url = reverse("statut-detail", args=[statut.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        statut.refresh_from_db()
        self.assertFalse(statut.is_active)

    def test_list_excludes_archived_statuts(self):
        archived = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#999999", is_active=False)
        visible = Statut.objects.create(nom=Statut.PLEINE, couleur="#111111")

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results") or response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(archived.id, returned_ids)

    def test_badge_html_display(self):
        statut = Statut.objects.create(nom=Statut.PLEINE, couleur="#000000")
        badge = statut.get_badge_html()
        self.assertIn("<span", badge)
        self.assertIn('style="background-color:#000000;', badge)

    def test_csv_row_and_headers(self):
        statut = Statut.objects.create(nom=Statut.PLEINE, couleur="#123456")
        csv_row = statut.to_csv_row()
        headers = Statut.get_csv_headers()
        fields = Statut.get_csv_fields()
        self.assertEqual(len(csv_row), len(headers))
        self.assertEqual(len(csv_row), len(fields))
