from datetime import timedelta

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from rap_app.models.candidat import Candidat
from rap_app.models.centres import Centre
from rap_app.models.cvtheque import CVTheque
from rap_app.models.custom_user import CustomUser
from rap_app.models.formations import Formation
from rap_app.models.partenaires import Partenaire
from rap_app.models.prospection import Prospection, ProspectionChoices
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
        self.candidat = Candidat.objects.create(
            nom="Dupont",
            prenom="Jeanne",
            email="jeanne.contract@example.com",
            formation=self.formation,
            created_by=self.user,
        )
        self.cv = CVTheque.objects.create(
            candidat=self.candidat,
            document_type="CV",
            fichier=SimpleUploadedFile("cv.pdf", b"%PDF-1.4 contract", content_type="application/pdf"),
            titre="CV principal",
            created_by=self.user,
        )
        self.partenaire = Partenaire.objects.create(
            nom="Partenaire Contract",
            type="entreprise",
            created_by=self.user,
        )
        self.prospection = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Prospection contract",
            created_by=self.user,
            owner=self.user,
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

    def test_register_success_uses_standard_envelope(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("register"),
            {
                "email": "new.user@example.com",
                "password": "Password123!",
                "first_name": "New",
                "last_name": "User",
                "consent_rgpd": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["email"], "new.user@example.com")

    def test_register_validation_error_uses_standard_envelope(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("register"),
            {
                "email": "invalid.user@example.com",
                "password": "Password123!",
                "first_name": "Invalid",
                "last_name": "User",
                "consent_rgpd": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])

    def test_formations_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-filtres"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("centres", response.data["data"])
        self.assertIn("statuts", response.data["data"])

    def test_candidats_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("candidat-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("centre_choices", response.data["data"])
        self.assertIn("formation_choices", response.data["data"])

    def test_prospections_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("prospection-get-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("formations", response.data["data"])
        self.assertIn("partenaires", response.data["data"])

    def test_cvtheque_list_uses_standard_paginated_envelope_with_filters(self):
        response = self.client.get(reverse("cvtheque-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("results", response.data["data"])
        self.assertIn("filters", response.data["data"])
        self.assertIsInstance(response.data["data"]["results"], list)

    def test_roles_endpoint_uses_standard_envelope(self):
        response = self.client.get(reverse("roles"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIsInstance(response.data["data"], list)
        self.assertGreater(len(response.data["data"]), 0)

    def test_search_validation_error_uses_standard_envelope(self):
        response = self.client.get(reverse("search"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertIn("q", response.data["errors"])

    def test_search_success_uses_standard_envelope(self):
        response = self.client.get(reverse("search"), {"q": "Formation"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("formations", response.data["data"])
        self.assertIn("commentaires", response.data["data"])
