from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.centres import Centre
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.statut import Statut
from rap_app.models.types_offre import TypeOffre
from rap_app.tests.factories import UserFactory


class ApiResponseContractTests(APITestCase):
    def setUp(self):
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre Contract", created_by=self.user)
        self.type_offre = TypeOffre.objects.create(nom=TypeOffre.CRIF, created_by=self.user)
        self.statut = Statut.objects.create(nom=Statut.NON_DEFINI, couleur="#000000", created_by=self.user)
        today = timezone.localdate()
        self.formation = Formation.objects.create(
            nom="Formation Contract",
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            start_date=today + timedelta(days=3),
            end_date=today + timedelta(days=30),
            created_by=self.user,
        )

    def test_formations_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-detail", args=[self.formation.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], self.formation.id)

    def test_documents_validation_error_uses_standard_envelope(self):
        response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "invalid.exe",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("invalid.exe", b"bad", content_type="application/octet-stream"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertIsInstance(response.data["errors"], dict)

    def test_users_validation_error_uses_standard_envelope(self):
        response = self.client.post(
            reverse("user-list"),
            {
                "email": "",
                "username": "",
                "role": "stagiaire",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertIsInstance(response.data["errors"], dict)
