"""Tests relatifs a scoped viewset."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from rap_app.api.viewsets.scoped_viewset import ScopedModelViewSet
from rap_app.models.centres import Centre
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class DummyFormationScopedViewSet(ScopedModelViewSet):
    """Cas de test pour Dummy Formation Scoped View Set."""
    queryset = Formation.objects.all()
    scope_mode = "centre"
    centre_lookup_paths = ("centre_id",)


class ScopedModelViewSetTests(TestCase):
    """Cas de test pour Scoped Model View Set Tests."""
    def setUp(self):
        self.factory = APIRequestFactory()
        self.centre_visible = Centre.objects.create(nom="Centre visible")
        self.centre_hidden = Centre.objects.create(nom="Centre cache")
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI)
        today = timezone.localdate()

        self.formation_visible = Formation.objects.create(
            nom="Formation visible",
            centre=self.centre_visible,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=30),
        )
        self.formation_hidden = Formation.objects.create(
            nom="Formation cachee",
            centre=self.centre_hidden,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=7),
            end_date=today + timedelta(days=30),
        )

    def _build_view(self, user):
        request = self.factory.get("/fake-formations/")
        request.user = user
        view = DummyFormationScopedViewSet()
        view.request = request
        view.args = ()
        view.kwargs = {}
        return view

    def test_build_centre_scope_q_uses_expected_lookup(self):
        user = UserFactory(role="staff")
        user.centres.add(self.centre_visible)
        view = self._build_view(user)

        q = view.build_centre_scope_q()

        self.assertEqual(q.children, [("centre_id__in", [self.centre_visible.id])])

    def test_centre_scope_returns_only_visible_rows(self):
        user = UserFactory(role="staff")
        user.centres.add(self.centre_visible)
        view = self._build_view(user)

        ids = list(view.get_queryset().values_list("id", flat=True))

        self.assertEqual(ids, [self.formation_visible.id])

    def test_centre_scope_is_deny_by_default_without_centres(self):
        user = UserFactory(role="staff")
        view = self._build_view(user)

        self.assertFalse(view.get_queryset().exists())
