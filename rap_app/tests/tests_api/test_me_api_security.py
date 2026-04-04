"""Tests relatifs a me api security."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.custom_user import CustomUser
from rap_app.tests.factories import UserFactory


class MeApiSecurityTests(APITestCase):
    """Cas de test pour Me Api Security Tests."""
    def setUp(self):
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN, password="password123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("me")

    def test_me_endpoint_does_not_expose_sensitive_internal_fields(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data["data"]

        self.assertEqual(payload["email"], self.user.email)
        self.assertNotIn("password", payload)
        self.assertNotIn("groups", payload)
        self.assertNotIn("user_permissions", payload)
        self.assertNotIn("last_login", payload)
