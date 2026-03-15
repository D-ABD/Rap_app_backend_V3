# rap_app/tests/tests_permissions.py
"""
Tests des permissions API, notamment IsAdmin (corrigée pour utiliser
is_admin_like / is_staff_or_staffread au lieu de user.is_staff_or_admin()).
"""

from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from ..api.permissions import IsAdmin
from ..models.custom_user import CustomUser
from .factories import UserFactory


class IsAdminPermissionTest(TestCase):
    """Vérifie que IsAdmin accorde l'accès via is_admin_like et is_staff_or_staffread."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsAdmin()

    def _request(self, user):
        request = Request(self.factory.get("/fake/"))
        request.user = user
        return request

    def test_anonymous_denied(self):
        from django.contrib.auth.models import AnonymousUser

        request = self._request(AnonymousUser())
        self.assertFalse(self.permission.has_permission(request, None))

    def test_admin_has_permission(self):
        user = UserFactory(role=CustomUser.ROLE_ADMIN)
        request = self._request(user)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_superadmin_has_permission(self):
        user = UserFactory(role=CustomUser.ROLE_SUPERADMIN)
        request = self._request(user)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_staff_has_permission(self):
        user = UserFactory(role=CustomUser.ROLE_STAFF)
        request = self._request(user)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_staff_read_has_permission(self):
        user = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        request = self._request(user)
        self.assertTrue(self.permission.has_permission(request, None))

    def test_stagiaire_denied(self):
        user = UserFactory(role=CustomUser.ROLE_STAGIAIRE)
        request = self._request(user)
        self.assertFalse(self.permission.has_permission(request, None))
