# rap_app/tests/tests_serializers/tests_declic_objectifs_serializers.py
"""
Tests du serializer ObjectifDeclicSerializer, notamment la validation métier
sur valeur_objectif (strictement positive) ajoutée suite à la levée de doute.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from ...api.serializers.declic_objectifs_serializers import ObjectifDeclicSerializer
from ...models.centres import Centre
from ...models.declic import ObjectifDeclic

User = get_user_model()


class ObjectifDeclicSerializerValidationTest(TestCase):
    """Validation du champ valeur_objectif (doit être strictement positive)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="staff@example.com",
            username="staff",
            password="pass",
            role=User.ROLE_STAFF,
        )
        self.centre = Centre.objects.create(nom="Centre Test", created_by=self.user)
        self.factory = APIRequestFactory()

    def test_valid_positive_value_accepted(self):
        """Une valeur_objectif > 0 est acceptée."""
        data = {
            "centre_id": self.centre.pk,
            "annee": 2025,
            "valeur_objectif": 100,
            "commentaire": "OK",
        }
        request = self.factory.post("/fake/")
        request.user = self.user
        serializer = ObjectifDeclicSerializer(data=data, context={"request": Request(request)})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["valeur_objectif"], 100)

    def test_zero_rejected(self):
        """valeur_objectif == 0 lève une ValidationError."""
        data = {
            "centre_id": self.centre.pk,
            "annee": 2025,
            "valeur_objectif": 0,
            "commentaire": "",
        }
        request = self.factory.post("/fake/")
        request.user = self.user
        serializer = ObjectifDeclicSerializer(data=data, context={"request": Request(request)})
        self.assertFalse(serializer.is_valid())
        self.assertIn("valeur_objectif", serializer.errors)
        self.assertIn("strictement positive", str(serializer.errors["valeur_objectif"]).lower())

    def test_negative_rejected(self):
        """valeur_objectif < 0 lève une ValidationError."""
        data = {
            "centre_id": self.centre.pk,
            "annee": 2025,
            "valeur_objectif": -10,
            "commentaire": "",
        }
        request = self.factory.post("/fake/")
        request.user = self.user
        serializer = ObjectifDeclicSerializer(data=data, context={"request": Request(request)})
        self.assertFalse(serializer.is_valid())
        self.assertIn("valeur_objectif", serializer.errors)
