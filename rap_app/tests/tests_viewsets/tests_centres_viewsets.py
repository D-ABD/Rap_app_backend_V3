from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class CentreViewSetTestCase(AuthenticatedTestCase):
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
        self.assertGreaterEqual(len(response.data["data"]["results"]), 2)

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
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        # API fait une suppression réelle (hard delete)
        self.assertEqual(Centre.objects.filter(pk=centre.pk).count(), 0)

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
