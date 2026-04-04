"""Tests relatifs a stats error contracts."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.custom_user import CustomUser


class StatsErrorContractTests(APITestCase):
    """Cas de test pour Stats Error Contract Tests."""
    def setUp(self):
        self.user = CustomUser.objects.create_user_with_role(
            email="stats.errors@example.com",
            username="stats_errors",
            password="Password123!",
            role=CustomUser.ROLE_STAFF,
        )
        self.client.force_authenticate(user=self.user)

    def _assert_invalid_by_envelope(self, route_name):
        response = self.client.get(reverse(route_name), {"by": "invalide"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertIsInstance(response.data["message"], str)
        self.assertTrue(response.data["message"])

    def test_appairage_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("appairage-stats-grouped")

    def test_candidat_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("candidat-stats-grouped")

    def test_prospection_comment_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("prospection-comment-stats-grouped")

    def test_appairage_comment_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("appairage-commentaire-stats-grouped")

    def test_prepa_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("prepa-stats-grouped")

    def test_declic_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("declic-stats-grouped")

    def test_atelier_tre_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("ateliertre-stats-grouped")

    def test_commentaire_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("commentaire-stats-grouped")

    def test_prospection_stats_grouped_invalid_by_uses_standard_envelope(self):
        self._assert_invalid_by_envelope("prospection-stats-grouped")
