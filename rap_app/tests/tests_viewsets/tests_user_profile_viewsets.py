from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.logs import LogUtilisateur
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class CustomUserViewSetTestCase(AuthenticatedTestCase):
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("user-list")
        self.me_url = reverse("user-me")
        self.roles_url = reverse("user-roles")

    def test_list_users(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        self.assertTrue(response.data["success"])

    def test_create_user(self):
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "role": "stagiaire",
            "phone": "0606060606",
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["email"], data["email"])

        # Vérification du log de création
        created_user_id = response.data["data"]["id"]
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(CustomUser),
            object_id=created_user_id,
            action__icontains="création",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de création non détecté.")

    def test_retrieve_user(self):
        response = self.client.get(reverse("user-detail", args=[self.user.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["email"], self.user.email)

    def test_update_user(self):
        url = reverse("user-detail", args=[self.user.id])
        data = {"first_name": "Modifié"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["first_name"], "Modifié")

        # Vérification du log de modification
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(CustomUser),
            object_id=self.user.pk,
            action__icontains="modification",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de modification non détecté.")

    def test_delete_user_sets_is_active_false(self):
        url = reverse("user-detail", args=[self.user.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

        # Vérification du log de suppression
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(CustomUser),
            object_id=self.user.pk,
            action__icontains="suppression",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de suppression non détecté.")

    def test_me_endpoint(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["email"], self.user.email)

    def test_roles_endpoint(self):
        response = self.client.get(self.roles_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("stagiaire", response.data["data"])
        self.assertTrue(response.data["success"])

    def test_admin_can_reactivate_inactive_user(self):
        inactive_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE, is_active=False)

        response = self.client.post(reverse("user-reactivate", args=[inactive_user.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        inactive_user.refresh_from_db()
        self.assertTrue(inactive_user.is_active)

    def test_staff_cannot_reactivate_inactive_user(self):
        inactive_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE, is_active=False)
        staff_user = UserFactory(role=CustomUser.ROLE_STAFF)
        self.client.force_authenticate(user=staff_user)

        response = self.client.post(reverse("user-reactivate", args=[inactive_user.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_create_user(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.post(
            self.list_url,
            {
                "email": "readonly.create@example.com",
                "username": "readonlycreate",
                "first_name": "Read",
                "last_name": "Only",
                "role": "stagiaire",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_update_user(self):
        target_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.patch(reverse("user-detail", args=[target_user.id]), {"first_name": "Blocked"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_delete_user(self):
        target_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.client.force_authenticate(user=staff_read)

        response = self.client.delete(reverse("user-detail", args=[target_user.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_list_users_is_scoped_to_assigned_centres(self):
        visible_centre = Centre.objects.create(nom="Centre Visible")
        hidden_centre = Centre.objects.create(nom="Centre Cache")
        visible_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        hidden_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        visible_user.centres.add(visible_centre)
        hidden_user.centres.add(hidden_centre)

        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(visible_centre)
        self.client.force_authenticate(user=staff_read)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(visible_user.id, returned_ids)
        self.assertNotIn(hidden_user.id, returned_ids)
