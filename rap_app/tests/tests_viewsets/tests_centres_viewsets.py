"""Tests relatifs a centres viewsets."""
from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class CentreViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Centre View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("centre-list")

    def test_create_centre_success(self):
        data = {"nom": "Nouveau Centre", "code_postal": "75015"}
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["nom"], "Nouveau Centre")

    def test_create_centre_invalid(self):
        data = {"nom": "", "code_postal": "7501"}  # Invalid
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_centres(self):
        Centre.objects.create(nom="Centre A", code_postal="75001")
        Centre.objects.create(nom="Centre B", code_postal="75002")
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des centres récupérée avec succès.")
        self.assertGreaterEqual(len(response.data["data"]["results"]), 2)

    def test_retrieve_centre_uses_standard_envelope(self):
        centre = Centre.objects.create(nom="Centre Detail", code_postal="75020")
        response = self.client.get(reverse("centre-detail", args=[centre.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], centre.id)

    def test_update_centre(self):
        centre = Centre.objects.create(nom="Modifiable", code_postal="75010")
        url = reverse("centre-detail", args=[centre.pk])
        data = {"nom": "Modifié", "code_postal": "75011"}
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["nom"], "Modifié")

    def test_delete_centre(self):
        centre = Centre.objects.create(nom="Centre Test", code_postal="75000", is_active=True)
        url = reverse("centre-detail", args=[centre.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        centre.refresh_from_db()
        self.assertFalse(centre.is_active)

    def test_staff_read_cannot_create_centre(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.post(self.list_url, {"nom": "Centre Interdit", "code_postal": "75015"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_update_centre(self):
        centre = Centre.objects.create(nom="Centre A", code_postal="75001")
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.put(reverse("centre-detail", args=[centre.pk]), {"nom": "Modifie", "code_postal": "75002"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_delete_centre(self):
        centre = Centre.objects.create(nom="Centre A", code_postal="75001")
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.delete(reverse("centre-detail", args=[centre.pk]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_list_is_scoped_to_assigned_centres(self):
        visible = Centre.objects.create(nom="Centre Visible", code_postal="75001")
        hidden = Centre.objects.create(nom="Centre Cache", code_postal="69001")
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(visible)
        self.client.force_authenticate(user=staff_read)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_list_excludes_archived_centres(self):
        archived = Centre.objects.create(nom="Centre Archive", code_postal="13001", is_active=False)
        visible = Centre.objects.create(nom="Centre Visible", code_postal="75001", is_active=True)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(archived.id, returned_ids)

    def test_prepa_staff_list_is_scoped_to_assigned_centres(self):
        visible = Centre.objects.create(nom="Centre Prepa Visible", code_postal="75003")
        hidden = Centre.objects.create(nom="Centre Prepa Cache", code_postal="69003")
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(visible)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_prepa_staff_liste_simple_is_scoped_to_assigned_centres(self):
        visible = Centre.objects.create(nom="Centre Prepa Select", code_postal="75004")
        hidden = Centre.objects.create(nom="Centre Prepa Hors Scope", code_postal="69004")
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        prepa_staff.centres.add(visible)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.get(reverse("centre-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_prepa_staff_cannot_create_centre(self):
        prepa_staff = UserFactory(role=CustomUser.ROLE_PREPA_STAFF)
        self.client.force_authenticate(user=prepa_staff)

        response = self.client.post(self.list_url, {"nom": "Centre Interdit Prepa", "code_postal": "75016"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_declic_staff_list_is_scoped_to_assigned_centres(self):
        visible = Centre.objects.create(nom="Centre Declic Visible", code_postal="75005")
        hidden = Centre.objects.create(nom="Centre Declic Cache", code_postal="69005")
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(visible)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_declic_staff_liste_simple_is_scoped_to_assigned_centres(self):
        visible = Centre.objects.create(nom="Centre Declic Select", code_postal="75006")
        hidden = Centre.objects.create(nom="Centre Declic Hors Scope", code_postal="69006")
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        declic_staff.centres.add(visible)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.get(reverse("centre-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible.id, returned_ids)
        self.assertNotIn(hidden.id, returned_ids)

    def test_declic_staff_cannot_create_centre(self):
        declic_staff = UserFactory(role=CustomUser.ROLE_DECLIC_STAFF)
        self.client.force_authenticate(user=declic_staff)

        response = self.client.post(self.list_url, {"nom": "Centre Interdit Declic", "code_postal": "75017"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
