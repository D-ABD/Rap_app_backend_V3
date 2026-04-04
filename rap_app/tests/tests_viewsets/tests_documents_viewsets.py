"""Tests relatifs a documents viewsets."""
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.documents import Document
from ...models.formations import Formation
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class DocumentViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Document View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="TestCentre", created_by=self.user)
        self.type_offre = TypeOffre.objects.create(nom="crif", created_by=self.user)
        self.statut = Statut.objects.create(nom="non_defini", couleur="#000000", created_by=self.user)

        self.formation = Formation.objects.create(
            nom="FormationDoc", centre=self.centre, type_offre=self.type_offre, statut=self.statut, created_by=self.user
        )

        self.file = SimpleUploadedFile("doc_test.pdf", b"file_content", content_type="application/pdf")
        self.document = Document.objects.create(
            formation=self.formation,
            nom_fichier="doc_test.pdf",
            fichier=self.file,
            type_document=Document.PDF,
            created_by=self.user,
        )
        self.addCleanup(self.document.fichier.close)
        self.addCleanup(self.file.close)

    def test_list_documents(self):
        url = reverse("document-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("data", response.data)

    def test_retrieve_document(self):
        url = reverse("document-detail", args=[self.document.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data.get("data", {}).get("id"), self.document.id)

    def test_create_document(self):
        url = reverse("document-list")
        file = SimpleUploadedFile("new_doc.pdf", b"%PDF-1.4...", content_type="application/pdf")
        data = {
            "formation": self.formation.id,
            "nom_fichier": "new_doc.pdf",
            "type_document": Document.PDF,
            "fichier": file,
        }
        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIn("data", response.data)
        self.assertTrue(Document.objects.filter(nom_fichier="new_doc.pdf").exists())

    def test_update_document(self):
        url = reverse("document-detail", args=[self.document.id])
        data = {"nom_fichier": "updated_name.pdf"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data.get("data", {}).get("nom_fichier"), "updated_name.pdf")

    def test_delete_document(self):
        url = reverse("document-detail", args=[self.document.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.document.refresh_from_db()
        self.assertFalse(self.document.is_active)

    def test_delete_document_hides_it_from_default_list(self):
        response = self.client.delete(reverse("document-detail", args=[self.document.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        list_response = self.client.get(reverse("document-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        results = list_response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertNotIn(self.document.id, returned_ids)

    def test_list_documents_can_include_archived(self):
        self.document.is_active = False
        self.document.save(update_fields=["is_active"])

        response = self.client.get(reverse("document-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]
        self.assertIn(self.document.id, returned_ids)

    def test_unarchive_document(self):
        self.document.is_active = False
        self.document.save(update_fields=["is_active"])

        response = self.client.post(reverse("document-desarchiver", args=[self.document.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.document.refresh_from_db()
        self.assertTrue(self.document.is_active)

    def test_documents_by_formation(self):
        url = reverse("document-par-formation")
        response = self.client.get(url, {"formation": self.formation.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data.get("data", [])), 1)

    def test_export_csv(self):
        url = reverse("document-export-csv")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")

    def test_staff_sees_only_documents_in_its_centres(self):
        staff = UserFactory(role=CustomUser.ROLE_STAFF)
        staff.centres.add(self.centre)

        other_centre = Centre.objects.create(nom="OtherCentre", created_by=self.user)
        other_formation = Formation.objects.create(
            nom="FormationOther",
            centre=other_centre,
            type_offre=self.type_offre,
            statut=self.statut,
            created_by=self.user,
        )
        other_file = SimpleUploadedFile("other_doc.pdf", b"other_content", content_type="application/pdf")
        hidden_document = Document.objects.create(
            formation=other_formation,
            nom_fichier="other_doc.pdf",
            fichier=other_file,
            type_document=Document.PDF,
            created_by=self.user,
        )

        self.client.force_authenticate(user=staff)

        response = self.client.get(reverse("document-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("data", {}).get("results", [])
        returned_ids = [item["id"] for item in results]

        self.assertIn(self.document.id, returned_ids)
        self.assertNotIn(hidden_document.id, returned_ids)

    def test_staff_read_cannot_create_document(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre)
        self.client.force_authenticate(user=staff_read)

        file = SimpleUploadedFile("read_only.pdf", b"%PDF-1.4...", content_type="application/pdf")
        response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "read_only.pdf",
                "type_document": Document.PDF,
                "fichier": file,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_update_document(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre)
        self.client.force_authenticate(user=staff_read)

        response = self.client.patch(reverse("document-detail", args=[self.document.id]), {"nom_fichier": "x.pdf"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_read_cannot_delete_document(self):
        staff_read = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        staff_read.centres.add(self.centre)
        self.client.force_authenticate(user=staff_read)

        response = self.client.delete(reverse("document-detail", args=[self.document.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_commercial_can_list_but_cannot_create_document(self):
        commercial = UserFactory(role=CustomUser.ROLE_COMMERCIAL)
        commercial.centres.add(self.centre)
        self.client.force_authenticate(user=commercial)

        list_response = self.client.get(reverse("document-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)

        file = SimpleUploadedFile("commercial.pdf", b"%PDF-1.4...", content_type="application/pdf")
        create_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "commercial.pdf",
                "type_document": Document.PDF,
                "fichier": file,
            },
            format="multipart",
        )

        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_charge_recrutement_can_create_document_in_scope(self):
        charge = UserFactory(role=CustomUser.ROLE_CHARGE_RECRUTEMENT)
        charge.centres.add(self.centre)
        self.client.force_authenticate(user=charge)

        file = SimpleUploadedFile("charge.pdf", b"%PDF-1.4...", content_type="application/pdf")
        response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "charge.pdf",
                "type_document": Document.PDF,
                "fichier": file,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
