"""Tests relatifs a logs viewsets."""
from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.logs import LogUtilisateur
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class LogUtilisateurViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Log Utilisateur View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre log", created_by=self.user)
        self.log = LogUtilisateur.log_action(
            instance=self.centre, action=LogUtilisateur.ACTION_CREATE, user=self.user, details="Création test"
        )

        self.list_url = reverse("logutilisateur-list")
        self.detail_url = reverse("logutilisateur-detail", args=[self.log.pk])

    def test_list_logs_success_structure(self):
        """
        ✅ Liste des logs avec structure complète : success, message, data
        """
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("data", response.data)
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_retrieve_log_success_structure(self):
        """
        ✅ Détail d’un log avec structure complète
        """
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Log utilisateur récupéré avec succès.")
        self.assertIn("data", response.data)
        self.assertEqual(response.data["data"]["id"], self.log.pk)
        self.assertEqual(response.data["data"]["user"], self.user.username)

    def test_post_not_allowed(self):
        """
        🚫 Méthode POST non autorisée sur les logs
        """
        response = self.client.post(self.list_url, {"action": "test"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_not_allowed(self):
        """
        🚫 Méthode DELETE non autorisée sur les logs
        """
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_log_choices_uses_success_structure(self):
        response = self.client.get(reverse("log-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix des logs récupérés avec succès.")
        self.assertIn("actions", response.data["data"])
        self.assertIn("models", response.data["data"])

    def test_permissions_required(self):
        """
        🚫 Accès refusé sans authentification → 401 Unauthorized
        """
        self.client.logout()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
