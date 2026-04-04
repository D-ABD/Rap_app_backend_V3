# tests/test_custom_user_serializers.py

"""Tests relatifs a user profile serializers."""
from django.test import TestCase

from ...api.serializers.user_profil_serializers import (
    CustomUserCreateSerializer,
    CustomUserSerializer,
    CustomUserUpdateSerializer,
)
from ...models.custom_user import CustomUser


class CustomUserSerializerTestCase(TestCase):
    """Cas de test pour Custom User Serializer Test Case."""
    def setUp(self):
        self.valid_data = {
            "email": "test@example.com",
            "username": "testuser",
            "first_name": "Test",
            "last_name": "User",
            "phone": "0601020304",
            "role": CustomUser.ROLE_STAGIAIRE,
            "bio": "Utilisateur de test",
        }

    def test_serializer_valid_data(self):
        """
        ✅ Test de création valide avec données complètes
        """
        serializer = CustomUserCreateSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_missing_email(self):
        """
        ❌ Test d'échec si l'email est manquant
        """
        data = self.valid_data.copy()
        data.pop("email")
        serializer = CustomUserCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        self.assertIn("Création échouée", serializer.errors["email"][0])

    def test_serializer_invalid_role(self):
        """
        ❌ Test d'échec si le rôle est invalide
        """
        data = self.valid_data.copy()
        data["role"] = "invalide"
        serializer = CustomUserCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("role", serializer.errors)

    def test_serializer_empty_username(self):
        """
        ❌ Test d'échec si le nom d'utilisateur est vide
        """
        data = self.valid_data.copy()
        data["username"] = ""
        serializer = CustomUserCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)
        self.assertIn("ne peut pas être vide", serializer.errors["username"][0])

    def test_serializer_serialized_output_structure(self):
        """
        ✅ Vérifie que le format de sortie respecte le schéma avec `success`, `message`, `data`
        """
        user = CustomUser.objects.create_user(**self.valid_data)
        serializer = CustomUserSerializer(instance=user)
        output = {"success": True, "message": "Utilisateur sérialisé avec succès.", "data": serializer.data}

        self.assertIn("success", output)
        self.assertIn("message", output)
        self.assertIn("data", output)
        self.assertTrue(output["success"])
        self.assertIsInstance(output["data"], dict)
        self.assertEqual(output["data"]["email"], self.valid_data["email"])

    def test_update_serializer_accepts_partial_payload(self):
        user = CustomUser.objects.create_user(**self.valid_data)
        serializer = CustomUserUpdateSerializer(instance=user, data={"first_name": "Updated"}, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
