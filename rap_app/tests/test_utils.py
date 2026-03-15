# rap_app/tests/test_utils.py
"""
Utilitaires partagés pour les tests.
AuthenticatedTestCase : base pour les tests de ViewSet avec utilisateur authentifié par défaut.
"""
from rest_framework.test import APITestCase

from .factories import UserFactory


class AuthenticatedTestCase(APITestCase):
    """
    TestCase API (DRF) avec authentification par défaut.
    Crée un utilisateur via UserFactory et appelle force_authenticate dans setUp,
    ce qui évite les erreurs du type « updated_by must be a CustomUser instance »
    (AnonymousUser) dans les vues qui enregistrent created_by/updated_by.
    """
    def setUp(self):
        super().setUp()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
