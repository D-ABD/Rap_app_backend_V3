from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.custom_user import CustomUser


class JwtAuthTests(APITestCase):
    def setUp(self):
        self.password = "password123"
        self.user = CustomUser.objects.create_user_with_role(
            email="jwt@example.com",
            username="jwt_user",
            password=self.password,
            role=CustomUser.ROLE_ADMIN,
        )

    def test_token_obtain_pair_with_email(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": self.password},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_refresh_returns_new_access_token(self):
        obtain = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": self.password},
            format="json",
        )
        self.assertEqual(obtain.status_code, status.HTTP_200_OK)

        refresh = self.client.post(
            reverse("token_refresh"),
            {"refresh": obtain.data["refresh"]},
            format="json",
        )

        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh.data)

    def test_token_obtain_pair_invalid_credentials_uses_generic_message(self):
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": self.user.email, "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["message"], "Identifiants invalides.")
