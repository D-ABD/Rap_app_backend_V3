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
from rap_app.models.appairage import Appairage
from rap_app.models.atelier_tre import AtelierTRE
from rap_app.models.commentaires import Commentaire
from rap_app.models.documents import Document
from rap_app.models.partenaires import Partenaire
from rap_app.models.prepa import Prepa
from rap_app.models.prospection import Prospection, ProspectionChoices
from rap_app.models.prospection_comments import ProspectionComment
from rap_app.models.commentaires_appairage import CommentaireAppairage
from rap_app.models.declic import Declic
from rap_app.models.cerfa_contrats import CerfaContrat
from rap_app.models.logs import LogUtilisateur
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
        self.appairage = Appairage.objects.create(
            candidat=self.candidat,
            partenaire=self.partenaire,
            formation=self.formation,
            created_by=self.user,
        )
        self.atelier = AtelierTRE.objects.create(
            type_atelier=AtelierTRE.TypeAtelier.ATELIER_1,
            centre=self.centre,
            created_by=self.user,
        )

    def test_health_uses_standard_envelope(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("health-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "API en bonne santé.")
        self.assertEqual(response.data["data"]["status"], "healthy")
        self.assertEqual(response.data["data"]["database"], "ok")

    def test_formations_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-detail", args=[self.formation.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], self.formation.id)
        self.assertEqual(
            response.data["data"]["candidats_list_url"],
            f"http://testserver{reverse('candidat-list')}?formation={self.formation.id}",
        )

    def test_formations_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("formation-list"),
            {
                "nom": "Formation Create Contract",
                "centre_id": self.centre.id,
                "type_offre_id": self.type_offre.id,
                "statut_id": self.statut.id,
                "start_date": (timezone.localdate() + timedelta(days=10)).isoformat(),
                "end_date": (timezone.localdate() + timedelta(days=40)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Formation créée avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Formation Create Contract")

    def test_formations_update_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("formation-detail", args=[self.formation.id]),
            {"nom": "Formation Updated Contract"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Formation mise à jour avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Formation Updated Contract")

    def test_formations_list_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_formations_stats_par_mois_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-stats-par-mois"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "extra"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques mensuelles des formations récupérées.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("global_scoped", response.data["extra"])
        self.assertIn("par_centre", response.data["extra"])

    def test_formations_liste_simple_uses_standard_envelope(self):
        response = self.client.get(reverse("formation-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste simplifiée des formations récupérée.")
        self.assertIsInstance(response.data["data"], list)

    def test_formations_archived_list_uses_standard_envelope(self):
        self.formation.archiver(user=self.user, commentaire="Archivage contrat")

        response = self.client.get(reverse("formation-archivees"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des formations archivées")
        self.assertIsInstance(response.data["data"], list)

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

    def test_documents_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "created.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("created.pdf", b"%PDF-1.4 created", content_type="application/pdf"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document créé avec succès.")
        self.assertEqual(response.data["data"]["formation"], self.formation.id)

    def test_documents_retrieve_uses_standard_envelope(self):
        create_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "detail.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("detail.pdf", b"%PDF-1.4 detail", content_type="application/pdf"),
            },
            format="multipart",
        )
        document_id = create_response.data["data"]["id"]

        response = self.client.get(reverse("document-detail", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_list_uses_standard_paginated_envelope(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "list.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("list.pdf", b"%PDF-1.4 list", content_type="application/pdf"),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]

        response = self.client.get(reverse("document-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(document_id, returned_ids)

    def test_documents_update_uses_standard_envelope(self):
        create_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "update.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("update.pdf", b"%PDF-1.4 update", content_type="application/pdf"),
            },
            format="multipart",
        )
        document_id = create_response.data["data"]["id"]

        response = self.client.patch(
            reverse("document-detail", args=[document_id]),
            {"nom_fichier": "updated.pdf"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_par_formation_missing_param_uses_standard_envelope(self):
        response = self.client.get(reverse("document-par-formation"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Paramètre 'formation' requis.")
        self.assertIsNone(response.data["data"])

    def test_documents_par_formation_success_uses_standard_envelope(self):
        response = self.client.get(reverse("document-par-formation"), {"formation": self.formation.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Documents de la formation récupérés avec succès.")
        self.assertIsInstance(response.data["data"], list)

    def test_documents_types_uses_standard_envelope(self):
        response = self.client.get(reverse("document-types"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Types de documents disponibles.")
        self.assertIsInstance(response.data["data"], list)

    def test_documents_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("document-get-filtres"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("centres", response.data["data"])
        self.assertIn("statuts", response.data["data"])
        self.assertIn("type_offres", response.data["data"])
        self.assertIn("formations", response.data["data"])

    def test_documents_desarchiver_uses_standard_envelope(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "restore.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile("restore.pdf", b"%PDF-1.4 restore", content_type="application/pdf"),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]
        self.client.delete(reverse("document-detail", args=[document_id]))

        response = self.client.post(reverse("document-desarchiver", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document restauré avec succès.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_desarchiver_already_active_uses_standard_envelope(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "already-active.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "already-active.pdf",
                    b"%PDF-1.4 active",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]

        response = self.client.post(reverse("document-desarchiver", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document déjà actif.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_delete_already_archived_uses_standard_envelope(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "already-archived.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "already-archived.pdf",
                    b"%PDF-1.4 archived",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]
        self.client.delete(reverse("document-detail", args=[document_id]))

        response = self.client.delete(reverse("document-detail", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document déjà archivé.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_delete_uses_standard_success_message(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "archive-success.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "archive-success.pdf",
                    b"%PDF-1.4 archive-success",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]

        response = self.client.delete(reverse("document-detail", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], document_id)

    def test_documents_hard_delete_uses_standard_envelope_and_logs_action(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "hard-delete.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "hard-delete.pdf",
                    b"%PDF-1.4 hard-delete",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]
        self.client.delete(reverse("document-detail", args=[document_id]))

        response = self.client.post(reverse("document-hard-delete", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("Suppression definitive", response.data["message"])
        self.assertEqual(response.data["data"]["id"], document_id)
        self.assertTrue(response.data["data"]["hard_deleted"])
        self.assertFalse(Document._base_manager.filter(pk=document_id).exists())
        self.assertTrue(
            LogUtilisateur.objects.filter(
                object_id=document_id,
                action=LogUtilisateur.ACTION_DELETE,
                created_by=self.user,
            ).exists()
        )

    def test_documents_hard_delete_rejects_active_resource(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "hard-delete-active.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "hard-delete-active.pdf",
                    b"%PDF-1.4 hard-delete-active",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]

        response = self.client.post(reverse("document-hard-delete", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertIn("archive", response.data["message"].lower())

    def test_documents_hard_delete_requires_admin_like(self):
        document_response = self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "hard-delete-staff.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "hard-delete-staff.pdf",
                    b"%PDF-1.4 hard-delete-staff",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )
        document_id = document_response.data["data"]["id"]
        self.client.delete(reverse("document-detail", args=[document_id]))

        staff_user = UserFactory(role=CustomUser.ROLE_STAFF)
        self.client.force_authenticate(user=staff_user)

        response = self.client.post(reverse("document-hard-delete", args=[document_id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.user)

    def test_partenaire_patch_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("partenaire-detail", args=[self.partenaire.id]),
            {"city": "Lyon"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], self.partenaire.id)
        self.assertEqual(response.data["data"]["city"], "Lyon")

    def test_partenaire_list_uses_standard_envelope(self):
        response = self.client.get(reverse("partenaire-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(len(response.data["data"]["results"]), 1)

    def test_partenaire_list_can_include_archived_items(self):
        archived = Partenaire.objects.create(
            nom="Partenaire Archive",
            type="entreprise",
            default_centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(reverse("partenaire-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_partenaire_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("partenaire-detail", args=[self.partenaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.partenaire.id)

    def test_partenaire_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("partenaire-list"),
            {
                "nom": "Partenaire Create Contract",
                "type": "entreprise",
                "default_centre_id": self.centre.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Partenaire Create Contract")

    def test_partenaire_desarchiver_uses_standard_envelope(self):
        self.partenaire.is_active = False
        self.partenaire.save(update_fields=["is_active"])

        response = self.client.post(reverse("partenaire-desarchiver", args=[self.partenaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaire désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_cvtheque_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("cvtheque-detail", args=[self.cv.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document CVThèque archivé avec succès.")
        self.cv.refresh_from_db()
        self.assertFalse(self.cv.is_active)

    def test_cvtheque_delete_already_archived_uses_standard_envelope(self):
        self.cv.is_active = False
        self.cv.save(update_fields=["is_active"])

        response = self.client.delete(reverse("cvtheque-detail", args=[self.cv.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document CVThèque déjà archivé.")
        self.assertEqual(response.data["data"]["id"], self.cv.id)

    def test_cvtheque_list_excludes_archived_documents(self):
        self.cv.is_active = False
        self.cv.save(update_fields=["is_active"])

        response = self.client.get(reverse("cvtheque-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        self.assertIsInstance(payload, dict)
        self.assertIn("results", payload)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertNotIn(self.cv.id, returned_ids)

    def test_cvtheque_list_can_include_archived_documents(self):
        self.cv.is_active = False
        self.cv.save(update_fields=["is_active"])

        response = self.client.get(reverse("cvtheque-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertIn(self.cv.id, returned_ids)

    def test_statut_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("statut-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix des statuts récupérés avec succès.")
        self.assertIn("results", response.data["data"])

    def test_logs_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("log-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix des logs récupérés avec succès.")
        self.assertIn("actions", response.data["data"])
        self.assertIn("models", response.data["data"])

    def test_logs_list_uses_standard_envelope(self):
        LogUtilisateur.log_action(
            instance=self.centre,
            action=LogUtilisateur.ACTION_CREATE,
            user=self.user,
            details="Creation log contract",
        )

        response = self.client.get(reverse("logutilisateur-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_logs_retrieve_uses_standard_envelope(self):
        log = LogUtilisateur.log_action(
            instance=self.centre,
            action=LogUtilisateur.ACTION_CREATE,
            user=self.user,
            details="Detail log contract",
        )

        response = self.client.get(reverse("logutilisateur-detail", args=[log.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Log utilisateur récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], log.pk)

    def test_typeoffre_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("typeoffre-detail", args=[self.type_offre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.type_offre.id)

    def test_typeoffre_list_uses_standard_envelope(self):
        response = self.client.get(reverse("typeoffre-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des types d'offres récupérée avec succès.")
        nested_payload = response.data["data"].get("data", response.data["data"])
        self.assertIn("results", nested_payload)

    def test_typeoffre_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("typeoffre-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des types d'offres prédéfinis.")
        self.assertIsInstance(response.data["data"], list)

    def test_typeoffre_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("typeoffre-list"),
            {"nom": TypeOffre.POEC, "autre": "", "couleur": "#123456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], TypeOffre.POEC)

    def test_typeoffre_update_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("typeoffre-detail", args=[self.type_offre.id]),
            {"couleur": "#654321"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre mis à jour avec succès.")
        self.assertEqual(response.data["data"]["couleur"], "#654321")

    def test_typeoffre_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("typeoffre-detail", args=[self.type_offre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.type_offre.id)
        self.type_offre.refresh_from_db()
        self.assertFalse(self.type_offre.is_active)

    def test_typeoffre_list_can_include_archived_items(self):
        archived = TypeOffre.objects.create(
            nom=TypeOffre.AUTRE,
            autre="Archive",
            couleur="#123456",
            is_active=False,
        )

        response = self.client.get(reverse("typeoffre-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_typeoffre_desarchiver_uses_standard_envelope(self):
        type_offre = TypeOffre.objects.create(
            nom=TypeOffre.AUTRE,
            autre="Archive",
            couleur="#123456",
            is_active=False,
        )

        response = self.client.post(reverse("typeoffre-desarchiver", args=[type_offre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Type d'offre désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_statut_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("statut-list"),
            {"nom": Statut.PLEINE, "couleur": "#112233"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], Statut.PLEINE)

    def test_statut_list_uses_standard_paginated_envelope(self):
        response = self.client.get(reverse("statut-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des statuts récupérée avec succès.")
        self.assertGreaterEqual(response.data["data"]["count"], 1)
        self.assertIsInstance(response.data["data"]["results"], list)

    def test_statut_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("statut-detail", args=[self.statut.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Détail du statut chargé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.statut.id)

    def test_statut_update_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("statut-detail", args=[self.statut.id]),
            {"couleur": "#445566"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut mis à jour avec succès.")
        self.assertEqual(response.data["data"]["couleur"], "#445566")

    def test_statut_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("statut-detail", args=[self.statut.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.statut.id)
        self.statut.refresh_from_db()
        self.assertFalse(self.statut.is_active)

    def test_statut_list_can_include_archived_items(self):
        archived = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            is_active=False,
        )

        response = self.client.get(reverse("statut-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_statut_desarchiver_uses_standard_envelope(self):
        statut = Statut.objects.create(
            nom=Statut.NON_DEFINI,
            couleur="#000000",
            is_active=False,
        )

        response = self.client.post(reverse("statut-desarchiver", args=[statut.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_candidat_creer_compte_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-creer-compte", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Compte candidat créé ou lié avec succès.")
        self.assertIn("user_id", response.data["data"])
        self.assertIn("user_role", response.data["data"])

    def test_candidat_valider_demande_compte_uses_standard_envelope(self):
        self.candidat.demande_compte_statut = Candidat.DemandeCompteStatut.EN_ATTENTE
        self.candidat.save(update_fields=["demande_compte_statut"])

        response = self.client.post(reverse("candidat-valider-demande-compte", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Demande de compte validée et compte utilisateur créé ou lié.")
        self.assertIn("user_id", response.data["data"])
        self.assertIn("user_email", response.data["data"])

    def test_candidat_refuser_demande_compte_uses_standard_envelope(self):
        self.candidat.demande_compte_statut = Candidat.DemandeCompteStatut.EN_ATTENTE
        self.candidat.save(update_fields=["demande_compte_statut"])

        response = self.client.post(reverse("candidat-refuser-demande-compte", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Demande de compte refusée.")
        self.assertIsNone(response.data["data"])

    def test_candidat_validate_inscription_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-validate-inscription", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Entrée dans le parcours de recrutement validée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("parcours_phase", response.data["data"])
        self.assertIn("date_validation_inscription", response.data["data"])

    def test_candidat_start_formation_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-start-formation", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Entrée en formation enregistrée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("parcours_phase", response.data["data"])
        self.assertIn("date_entree_formation_effective", response.data["data"])

    def test_candidat_cancel_start_formation_uses_standard_envelope(self):
        self.client.post(reverse("candidat-start-formation", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-cancel-start-formation", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Entrée en formation annulée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("parcours_phase", response.data["data"])
        self.assertIn("date_entree_formation_effective", response.data["data"])
        self.assertIn("date_sortie_formation", response.data["data"])

    def test_candidat_complete_formation_uses_standard_envelope(self):
        self.client.post(reverse("candidat-start-formation", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-complete-formation", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Sortie de formation enregistrée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("parcours_phase", response.data["data"])
        self.assertIn("date_sortie_formation", response.data["data"])

    def test_candidat_abandon_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-abandon", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Abandon enregistré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("parcours_phase", response.data["data"])

    def test_candidat_set_appairage_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-set-appairage", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'En appairage' enregistré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("en_appairage", response.data["data"])
        self.assertIn("statut", response.data["data"])

    def test_candidat_clear_appairage_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-appairage", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-clear-appairage", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'En appairage' retiré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("en_appairage", response.data["data"])
        self.assertIn("statut", response.data["data"])

    def test_candidat_set_accompagnement_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-set-accompagnement", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'En accompagnement TRE' enregistré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("en_accompagnement_tre", response.data["data"])
        self.assertIn("statut", response.data["data"])

    def test_candidat_clear_accompagnement_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-accompagnement", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-clear-accompagnement", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'En accompagnement TRE' retiré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertIn("en_accompagnement_tre", response.data["data"])
        self.assertIn("statut", response.data["data"])

    def test_candidat_set_admissible_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-set-admissible", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'Candidat admissible' enregistré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertTrue(response.data["data"]["admissible"])

    def test_candidat_clear_admissible_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-admissible", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-clear-admissible", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statut 'Candidat admissible' retiré.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertFalse(response.data["data"]["admissible"])

    def test_candidat_set_gespers_uses_standard_envelope(self):
        response = self.client.post(reverse("candidat-set-gespers", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Inscription GESPERS enregistrée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertTrue(response.data["data"]["inscrit_gespers"])

    def test_candidat_clear_gespers_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-gespers", args=[self.candidat.id]))

        response = self.client.post(reverse("candidat-clear-gespers", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Inscription GESPERS annulée.")
        self.assertEqual(response.data["data"]["candidat_id"], self.candidat.id)
        self.assertFalse(response.data["data"]["inscrit_gespers"])

    def test_candidat_bulk_validate_inscription_uses_standard_envelope(self):
        response = self.client.post(
            reverse("candidat-bulk-validate-inscription"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'inscription validée' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_set_admissible_uses_standard_envelope(self):
        response = self.client.post(
            reverse("candidat-bulk-set-admissible"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'candidat admissible' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_clear_admissible_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-admissible", args=[self.candidat.id]))

        response = self.client.post(
            reverse("candidat-bulk-clear-admissible"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'candidat admissible retiré' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_set_gespers_uses_standard_envelope(self):
        response = self.client.post(
            reverse("candidat-bulk-set-gespers"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'inscription GESPERS' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_clear_gespers_uses_standard_envelope(self):
        self.client.post(reverse("candidat-set-gespers", args=[self.candidat.id]))

        response = self.client.post(
            reverse("candidat-bulk-clear-gespers"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'inscription GESPERS annulée' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_start_formation_uses_standard_envelope(self):
        self.client.post(reverse("candidat-bulk-validate-inscription"), {"candidate_ids": [self.candidat.id]}, format="json")

        response = self.client.post(
            reverse("candidat-bulk-start-formation"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'entrée en formation' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_abandon_uses_standard_envelope(self):
        response = self.client.post(
            reverse("candidat-bulk-abandon"),
            {"candidate_ids": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Transition bulk 'abandon' exécutée.")
        self.assertIsInstance(response.data["data"], dict)
        self.assertIn("summary", response.data["data"])
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)

    def test_candidat_bulk_assign_atelier_tre_uses_standard_envelope(self):
        response = self.client.post(
            reverse("candidat-bulk-assign-atelier-tre"),
            {"candidate_ids": [self.candidat.id], "atelier_tre_id": self.atelier.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Affectation bulk à l'atelier TRE exécutée.")
        self.assertEqual(set(response.data["data"].keys()), {"summary", "succeeded_ids", "failed"})
        self.assertEqual(response.data["data"]["summary"]["requested"], 1)
        self.assertIn(self.candidat.id, response.data["data"]["succeeded_ids"])

    def test_candidat_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("candidat-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_appairage_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("appairage-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_formation_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("formation-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_prospection_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("prospection-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_partenaire_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("partenaire-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_logs_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("logutilisateur-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_logs_export_csv_returns_attachment_response(self):
        response = self.client.get(reverse("logutilisateur-export-csv"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".csv", response["Content-Disposition"])

    def test_logs_export_pdf_returns_attachment_response(self):
        response = self.client.get(reverse("logutilisateur-export-pdf"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_documents_export_csv_returns_attachment_response(self):
        response = self.client.get(reverse("document-export-csv"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".csv", response["Content-Disposition"])

    def test_evenements_export_csv_returns_attachment_response(self):
        response = self.client.get(reverse("evenement-export-csv"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".csv", response["Content-Disposition"])

    def test_atelier_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("ateliers-tre-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_rapport_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("rapport-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_rapport_detail_export_returns_attachment_response(self):
        from rap_app.models.rapports import Rapport

        rapport = Rapport.objects.create(
            nom="Rapport export detail",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=timezone.localdate() - timedelta(days=30),
            date_fin=timezone.localdate(),
            centre=self.centre,
            formation=self.formation,
            format="pdf",
            donnees={"resume": "Rapport export contrat"},
            created_by=self.user,
        )

        response = self.client.get(reverse("rapport-export", args=[rapport.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_rapport_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("rapport-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix des rapports récupérés avec succès.")
        self.assertIn("type_rapport", response.data["data"])
        self.assertIn("periode", response.data["data"])
        self.assertIn("format", response.data["data"])
        self.assertIn("reporting_contract", response.data["data"])

    def test_rapport_list_uses_standard_envelope(self):
        from rap_app.models.rapports import Rapport

        Rapport.objects.create(
            nom="Rapport liste",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=timezone.localdate() - timedelta(days=30),
            date_fin=timezone.localdate(),
            format=Rapport.FORMAT_HTML,
            centre=self.centre,
            formation=self.formation,
            created_by=self.user,
        )

        response = self.client.get(reverse("rapport-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(len(response.data["data"]["results"]), 1)

    def test_rapport_retrieve_uses_standard_envelope(self):
        from rap_app.models.rapports import Rapport

        rapport = Rapport.objects.create(
            nom="Rapport detail",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=timezone.localdate() - timedelta(days=30),
            date_fin=timezone.localdate(),
            format=Rapport.FORMAT_HTML,
            centre=self.centre,
            formation=self.formation,
            created_by=self.user,
        )

        response = self.client.get(reverse("rapport-detail", args=[rapport.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Rapport récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], rapport.id)

    def test_rapport_create_uses_standard_envelope(self):
        from rap_app.models.rapports import Rapport

        response = self.client.post(
            reverse("rapport-list"),
            {
                "nom": "Rapport cree",
                "type_rapport": Rapport.TYPE_STATUT,
                "periode": Rapport.PERIODE_HEBDOMADAIRE,
                "date_debut": (timezone.localdate() - timedelta(days=6)).isoformat(),
                "date_fin": timezone.localdate().isoformat(),
                "format": Rapport.FORMAT_HTML,
                "centre": self.centre.id,
                "type_offre": self.type_offre.id,
                "statut": self.statut.id,
                "formation": self.formation.id,
                "donnees": {"nb": 5},
                "temps_generation": 1.2,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Rapport créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Rapport cree")

    def test_rapport_update_uses_standard_envelope(self):
        from rap_app.models.rapports import Rapport

        rapport = Rapport.objects.create(
            nom="Rapport a modifier",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=timezone.localdate() - timedelta(days=30),
            date_fin=timezone.localdate(),
            format=Rapport.FORMAT_HTML,
            centre=self.centre,
            formation=self.formation,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("rapport-detail", args=[rapport.id]),
            {"nom": "Rapport modifie"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Rapport mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], rapport.id)
        self.assertEqual(response.data["data"]["nom"], "Rapport modifie")

    def test_prepa_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("prepa-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_declic_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("declic-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_stagiaire_prepa_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("stagiaire-prepa-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_stagiaire_prepa_export_emargement_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("stagiaire-prepa-export-emargement-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_stagiaire_prepa_export_presence_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("stagiaire-prepa-export-presence-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_participant_declic_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("participant-declic-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_participant_declic_export_presence_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("participant-declic-export-presence-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_participant_declic_export_emargement_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("participant-declic-export-emargement-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_prospection_comment_export_xlsx_returns_attachment_response(self):
        ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire export contrat",
            created_by=self.user,
        )

        response = self.client.get(reverse("prospection-comment-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_prospection_comment_export_pdf_returns_attachment_response(self):
        ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire export pdf contrat",
            created_by=self.user,
        )

        response = self.client.get(reverse("prospection-comment-export-pdf"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_appairage_comment_export_xlsx_returns_attachment_response(self):
        CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage export contrat",
            created_by=self.user,
        )

        response = self.client.get(reverse("appairage-commentaire-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_appairage_comment_export_pdf_returns_attachment_response(self):
        CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage export pdf contrat",
            created_by=self.user,
        )

        response = self.client.get(reverse("appairage-commentaire-export-pdf"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_cvtheque_desarchiver_uses_standard_envelope(self):
        self.cv.is_active = False
        self.cv.save(update_fields=["is_active"])

        response = self.client.post(reverse("cvtheque-desarchiver", args=[self.cv.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document CVThèque restauré avec succès.")
        self.cv.refresh_from_db()
        self.assertTrue(self.cv.is_active)

    def test_cvtheque_desarchiver_already_active_uses_standard_envelope(self):
        response = self.client.post(reverse("cvtheque-desarchiver", args=[self.cv.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document CVThèque déjà actif.")
        self.assertEqual(response.data["data"]["id"], self.cv.id)

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

    def test_user_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("user-list"),
            {
                "email": "api.contract.user@example.com",
                "username": "api_contract_user",
                "first_name": "Api",
                "last_name": "Contract",
                "role": "stagiaire",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Utilisateur créé avec succès.")
        self.assertEqual(response.data["data"]["email"], "api.contract.user@example.com")

    def test_user_list_uses_standard_envelope(self):
        response = self.client.get(reverse("user-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_user_update_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("user-detail", args=[self.user.id]),
            {"first_name": "Updated"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Utilisateur mis à jour avec succès.")
        self.assertEqual(response.data["data"]["first_name"], "Updated")

    def test_user_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("user-detail", args=[self.user.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Utilisateur récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.user.id)

    def test_user_me_action_uses_standard_envelope(self):
        response = self.client.get(reverse("user-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Profil utilisateur chargé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.user.id)

    def test_user_reactivate_uses_standard_envelope(self):
        inactive_user = UserFactory(role=CustomUser.ROLE_STAGIAIRE, is_active=False)

        response = self.client.post(reverse("user-reactivate", args=[inactive_user.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Utilisateur réactivé avec succès.")
        self.assertIsNone(response.data["data"])

    def test_user_delete_account_uses_standard_envelope(self):
        response = self.client.delete(reverse("user-delete-account"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIsNone(response.data["data"])

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
        self.assertEqual(response.data["message"], "Métadonnées candidats récupérées avec succès.")
        self.assertIn("centre_choices", response.data["data"])
        self.assertIn("formation_choices", response.data["data"])
        self.assertIn("parcours_phase_choices", response.data["data"])
        self.assertIn("statut_metier_choices", response.data["data"])
        self.assertIn("phase_contract", response.data["data"])
        self.assertIn("phase_filter_aliases", response.data["data"])
        self.assertIn("phase_ordering_fields", response.data["data"])
        self.assertIn("phase_transition_actions", response.data["data"])
        self.assertTrue(all("value" in item and "label" in item for item in response.data["data"]["centre_choices"]))
        self.assertTrue(all("value" in item and "label" in item for item in response.data["data"]["formation_choices"]))
        self.assertTrue(all("key" in item and "url_name" in item for item in response.data["data"]["phase_transition_actions"]))
        self.assertIn("rgpd_legal_basis_choices", response.data["data"])
        self.assertIn("rgpd_notice_status_choices", response.data["data"])
        self.assertIn("rgpd_creation_source_choices", response.data["data"])
        self.assertIn("rgpd_consent_fields", response.data["data"])
        self.assertEqual(response.data["data"]["phase_contract"]["legacy_status_field"], "statut")
        self.assertEqual(response.data["data"]["phase_contract"]["recommended_phase_field"], "parcours_phase")
        self.assertEqual(response.data["data"]["phase_contract"]["business_status_field"], "statut_metier_calcule")

    def test_prepa_filters_uses_standard_envelope(self):
        response = self.client.get(reverse("prepa-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres Prépa récupérés avec succès.")
        self.assertIn("type_prepa", response.data["data"])
        self.assertIn("centres", response.data["data"])

    def test_prepa_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("prepa-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées Prépa récupérées avec succès.")
        self.assertIn("type_prepa", response.data["data"])
        self.assertIn("centres", response.data["data"])
        self.assertTrue(all("value" in item and "label" in item for item in response.data["data"]["type_prepa"]))
        self.assertTrue(
            all("id" in item and "nom" in item and "code_postal" in item for item in response.data["data"]["centres"])
        )

    def test_declic_filters_uses_standard_envelope(self):
        response = self.client.get(reverse("declic-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres Déclic récupérés avec succès.")
        self.assertIn("type_declic", response.data["data"])
        self.assertIn("centres", response.data["data"])
        self.assertTrue(all("value" in item and "label" in item for item in response.data["data"]["type_declic"]))
        self.assertTrue(
            all(
                "value" in item and "label" in item and "code_postal" in item
                for item in response.data["data"]["centres"]
            )
        )

    def test_stagiaire_prepa_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("stagiaire-prepa-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées stagiaires Prépa récupérées avec succès.")
        self.assertIn("centres", response.data["data"])
        self.assertIn("statut_parcours", response.data["data"])
        self.assertIn("type_atelier", response.data["data"])
        self.assertIn("prepas_origine", response.data["data"])
        self.assertIn("annees", response.data["data"])

    def test_participant_declic_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("participant-declic-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées participants Déclic récupérées avec succès.")
        self.assertIn("centres", response.data["data"])
        self.assertIn("presence_choices", response.data["data"])
        self.assertIn("type_declic", response.data["data"])
        self.assertIn("declics_origine", response.data["data"])
        self.assertIn("annees", response.data["data"])

    def test_stagiaire_prepa_list_uses_standard_paginated_envelope(self):
        from rap_app.models.prepa import StagiairePrepa

        StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Durand",
            prenom="Lina",
            created_by=self.user,
        )

        response = self.client.get(reverse("stagiaire-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_stagiaire_prepa_retrieve_uses_standard_envelope(self):
        from rap_app.models.prepa import StagiairePrepa

        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Durand",
            prenom="Lina",
            created_by=self.user,
        )

        response = self.client.get(reverse("stagiaire-prepa-detail", args=[stagiaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], stagiaire.id)

    def test_stagiaire_prepa_create_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.post(
            reverse("stagiaire-prepa-list"),
            {
                "centre_id": self.centre.id,
                "prepa_origine_id": prepa.id,
                "nom": "Martin",
                "prenom": "Lise",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Martin")

    def test_stagiaire_prepa_update_uses_standard_envelope(self):
        from rap_app.models.prepa import StagiairePrepa

        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Durand",
            prenom="Lina",
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("stagiaire-prepa-detail", args=[stagiaire.id]),
            {"telephone": "0601020304"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa mis à jour avec succès.")
        self.assertEqual(response.data["data"]["telephone"], "0601020304")

    def test_stagiaire_prepa_delete_uses_standard_envelope(self):
        from rap_app.models.prepa import StagiairePrepa

        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Durand",
            prenom="Lina",
            created_by=self.user,
        )

        response = self.client.delete(reverse("stagiaire-prepa-detail", args=[stagiaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], stagiaire.id)

    def test_stagiaire_prepa_list_can_include_archived_items(self):
        from rap_app.models.prepa import StagiairePrepa

        archived = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Archive",
            prenom="Prepa",
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(reverse("stagiaire-prepa-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_stagiaire_prepa_desarchiver_uses_standard_envelope(self):
        from rap_app.models.prepa import StagiairePrepa

        stagiaire = StagiairePrepa.objects.create(
            centre=self.centre,
            nom="Archive",
            prenom="Prepa",
            is_active=False,
            created_by=self.user,
        )

        response = self.client.post(reverse("stagiaire-prepa-desarchiver", args=[stagiaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Stagiaire Prépa désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_participant_declic_list_uses_standard_paginated_envelope(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Lopez",
            prenom="Nora",
            created_by=self.user,
        )

        response = self.client.get(reverse("participant-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_participant_declic_retrieve_uses_standard_envelope(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        participant = ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Lopez",
            prenom="Nora",
            created_by=self.user,
        )

        response = self.client.get(reverse("participant-declic-detail", args=[participant.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], participant.id)

    def test_participant_declic_create_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.post(
            reverse("participant-declic-list"),
            {
                "centre_id": self.centre.id,
                "declic_origine_id": declic.id,
                "nom": "Lopez",
                "prenom": "Nora",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Lopez")

    def test_participant_declic_update_uses_standard_envelope(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        participant = ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Lopez",
            prenom="Nora",
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("participant-declic-detail", args=[participant.id]),
            {"present": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic mis à jour avec succès.")
        self.assertFalse(response.data["data"]["present"])

    def test_participant_declic_delete_uses_standard_envelope(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        participant = ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Lopez",
            prenom="Nora",
            created_by=self.user,
        )

        response = self.client.delete(reverse("participant-declic-detail", args=[participant.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], participant.id)

    def test_participant_declic_list_can_include_archived_items(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        archived = ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Archive",
            prenom="Declic",
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(reverse("participant-declic-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_participant_declic_desarchiver_uses_standard_envelope(self):
        from rap_app.models.declic import ParticipantDeclic

        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )
        participant = ParticipantDeclic.objects.create(
            declic_origine=declic,
            centre=self.centre,
            nom="Archive",
            prenom="Declic",
            is_active=False,
            created_by=self.user,
        )

        response = self.client.post(reverse("participant-declic-desarchiver", args=[participant.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Participant Déclic désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_prepa_stats_centres_uses_standard_envelope(self):
        response = self.client.get(reverse("prepa-stats-centres"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques Prépa par centre récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_prepa_stats_departements_uses_standard_envelope(self):
        response = self.client.get(reverse("prepa-stats-departements"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques Prépa par département récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_prepa_reste_a_faire_total_uses_standard_envelope(self):
        response = self.client.get(reverse("prepa-reste-a-faire-total"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Reste à faire Prépa récupéré avec succès.")
        self.assertIn("annee", response.data["data"])
        self.assertIn("reste_total", response.data["data"])

    def test_prepa_list_uses_standard_paginated_envelope(self):
        Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.get(reverse("prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_prepa_retrieve_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.get(reverse("prepa-detail", args=[prepa.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa récupérée avec succès.")
        self.assertEqual(response.data["data"]["id"], prepa.id)

    def test_prepa_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("prepa-list"),
            {
                "type_prepa": Prepa.TypePrepa.ATELIER1,
                "date_prepa": timezone.localdate().isoformat(),
                "centre_id": self.centre.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa créée avec succès.")
        self.assertEqual(response.data["data"]["centre"]["id"], self.centre.id)

    def test_prepa_update_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("prepa-detail", args=[prepa.id]),
            {"formateur_animateur": "Nadia Contract"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa mise à jour avec succès.")
        self.assertEqual(response.data["data"]["formateur_animateur"], "Nadia Contract")

    def test_declic_stats_centres_uses_standard_envelope(self):
        response = self.client.get(reverse("declic-stats-centres"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques Déclic par centre récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_declic_stats_departements_uses_standard_envelope(self):
        response = self.client.get(reverse("declic-stats-departements"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques Déclic par département récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_declic_list_uses_standard_paginated_envelope(self):
        Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.get(reverse("declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_declic_retrieve_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.get(reverse("declic-detail", args=[declic.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic récupérée avec succès.")
        self.assertEqual(response.data["data"]["id"], declic.id)

    def test_declic_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("declic-list"),
            {
                "type_declic": Declic.TypeDeclic.ATELIER1,
                "date_declic": timezone.localdate().isoformat(),
                "centre_id": self.centre.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic créée avec succès.")
        self.assertEqual(response.data["data"]["centre"]["id"], self.centre.id)

    def test_declic_update_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("declic-detail", args=[declic.id]),
            {"commentaire": "Commentaire contract"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic mise à jour avec succès.")
        self.assertEqual(response.data["data"]["commentaire"], "Commentaire contract")

    def test_prepa_delete_already_archived_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.delete(reverse("prepa-detail", args=[prepa.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_prepa_delete_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.delete(reverse("prepa-detail", args=[prepa.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa archivée avec succès.")
        self.assertEqual(response.data["data"]["id"], prepa.id)

    def test_prepa_list_can_include_archived_items(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(reverse("prepa-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == prepa.id for item in response.data["data"]["results"]))

    def test_prepa_desarchiver_uses_standard_envelope(self):
        prepa = Prepa.objects.create(
            type_prepa=Prepa.TypePrepa.ATELIER1,
            date_prepa=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.post(reverse("prepa-desarchiver", args=[prepa.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Prépa désarchivée avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_declic_delete_already_archived_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.delete(reverse("declic-detail", args=[declic.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_declic_delete_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            created_by=self.user,
        )

        response = self.client.delete(reverse("declic-detail", args=[declic.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic archivée avec succès.")
        self.assertEqual(response.data["data"]["id"], declic.id)

    def test_declic_list_can_include_archived_items(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.get(reverse("declic-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["id"] == declic.id for item in response.data["data"]["results"]))

    def test_declic_desarchiver_uses_standard_envelope(self):
        declic = Declic.objects.create(
            type_declic=Declic.TypeDeclic.ATELIER1,
            date_declic=timezone.now().date(),
            centre=self.centre,
            is_active=False,
            created_by=self.user,
        )

        response = self.client.post(reverse("declic-desarchiver", args=[declic.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Séance Déclic désarchivée avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_candidat_detail_exposes_phase_fields_without_breaking_envelope(self):
        response = self.client.get(reverse("candidat-detail", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)

        self.assertEqual(payload["id"], self.candidat.id)
        self.assertIn("parcours_phase", payload)
        self.assertIn("parcours_phase_calculee", payload)
        self.assertIn("is_inscrit_valide", payload)
        self.assertIn("is_en_formation_now", payload)
        self.assertIn("has_compte_utilisateur", payload)

    def test_candidat_list_uses_paginated_standard_envelope(self):
        response = self.client.get(reverse("candidat-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_candidat_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("candidat-detail", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.candidat.refresh_from_db()
        self.assertFalse(self.candidat.is_active)

    def test_candidat_list_can_include_archived_items(self):
        self.candidat.is_active = False
        self.candidat.save(update_fields=["is_active"])

        response = self.client.get(reverse("candidat-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        self.assertIn("results", payload)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertIn(self.candidat.id, returned_ids)

    def test_candidat_list_can_filter_archived_only_items(self):
        self.candidat.is_active = False
        self.candidat.save(update_fields=["is_active"])

        active_candidat = Candidat.objects.create(
            nom="Actif",
            prenom="Visible",
            email="actif-visible@example.com",
            formation=self.formation,
            created_by=self.user,
            updated_by=self.user,
            is_active=True,
        )

        response = self.client.get(reverse("candidat-list"), {"archives_seules": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data.get("data", response.data)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertIn(self.candidat.id, returned_ids)
        self.assertNotIn(active_candidat.id, returned_ids)

    def test_candidat_desarchiver_uses_standard_envelope(self):
        self.candidat.is_active = False
        self.candidat.save(update_fields=["is_active"])

        response = self.client.post(reverse("candidat-desarchiver", args=[self.candidat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Candidat désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_formation_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("formation-detail", args=[self.formation.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.formation.refresh_from_db()
        self.assertEqual(self.formation.activite, "archivee")

    def test_formation_hard_delete_uses_standard_envelope(self):
        self.client.delete(reverse("formation-detail", args=[self.formation.id]))

        response = self.client.post(reverse("formation-hard-delete", args=[self.formation.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("Suppression definitive", response.data["message"])
        self.assertEqual(response.data["data"]["id"], self.formation.id)
        self.assertTrue(response.data["data"]["hard_deleted"])
        self.assertFalse(Formation._base_manager.filter(pk=self.formation.id).exists())

    def test_prospections_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("prospection-get-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres prospections récupérés avec succès.")
        self.assertIn("formations", response.data["data"])
        self.assertIn("partenaires", response.data["data"])

    def test_prospections_filtres_include_visible_related_choices(self):
        response = self.client.get(reverse("prospection-get-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertIn(
            {"value": self.formation.id, "label": self.formation.nom},
            data["formations"],
        )
        self.assertIn(
            {"value": self.partenaire.id, "label": self.partenaire.nom},
            data["partenaires"],
        )
        self.assertTrue(any(owner["value"] == self.user.id for owner in data["owners"]))

    def test_prospections_choices_include_visible_related_choices(self):
        response = self.client.get(reverse("prospection-get-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix disponibles pour les prospections")
        data = response.data["data"]
        self.assertIn(
            {"value": self.partenaire.id, "label": self.partenaire.nom},
            data["partenaires"],
        )
        self.assertTrue(any(owner["value"] == self.user.id for owner in data["owners"]))

    def test_prospections_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("prospection-detail", args=[self.prospection.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Détail de la prospection")
        self.assertEqual(response.data["data"]["id"], self.prospection.id)

    def test_prospections_list_uses_paginated_envelope(self):
        response = self.client.get(reverse("prospection-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des prospections.")
        self.assertGreaterEqual(response.data["data"]["count"], 1)
        self.assertIsInstance(response.data["data"]["results"], list)

    def test_prospections_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("prospection-list"),
            {
                "partenaire": self.partenaire.id,
                "formation": self.formation.id,
                "date_prospection": timezone.now().isoformat(),
                "type_prospection": ProspectionChoices.TYPE_PREMIER_CONTACT,
                "motif": ProspectionChoices.MOTIF_PARTENARIAT,
                "statut": ProspectionChoices.STATUT_A_FAIRE,
                "objectif": ProspectionChoices.OBJECTIF_PRESENTATION,
                "commentaire": "Prospection create contract",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Prospection créée avec succès.")
        self.assertEqual(response.data["data"]["partenaire"], self.partenaire.id)

    def test_prospections_update_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("prospection-detail", args=[self.prospection.id]),
            {"commentaire": "Prospection updated contract"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Prospection mise à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], self.prospection.id)

    def test_prospections_delete_uses_standard_envelope(self):
        response = self.client.delete(reverse("prospection-detail", args=[self.prospection.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], f"Prospection #{self.prospection.id} archivée avec succès.")
        self.assertEqual(response.data["data"]["id"], self.prospection.id)

    def test_prospections_hard_delete_uses_standard_envelope(self):
        self.client.delete(reverse("prospection-detail", args=[self.prospection.id]))

        response = self.client.post(reverse("prospection-hard-delete", args=[self.prospection.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("Suppression definitive", response.data["message"])
        self.assertEqual(response.data["data"]["id"], self.prospection.id)
        self.assertTrue(response.data["data"]["hard_deleted"])
        self.assertFalse(Prospection._base_manager.filter(pk=self.prospection.id).exists())

    def test_prospections_changer_statut_uses_standard_envelope(self):
        response = self.client.post(
            reverse("prospection-changer-statut", args=[self.prospection.id]),
            {
                "statut": ProspectionChoices.STATUT_A_RELANCER,
                "commentaire": "Prospection status contract",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Prospection mise à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], self.prospection.id)

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
        self.assertEqual(response.data["message"], "Liste des rôles récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreater(len(response.data["data"]), 0)

    def test_me_reactivate_already_active_uses_standard_error_shape(self):
        response = self.client.post(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Votre compte est déjà actif.")
        self.assertIsNone(response.data["data"])

    def test_demande_compte_candidat_success_uses_standard_envelope(self):
        candidate_user = UserFactory(role=CustomUser.ROLE_CANDIDAT)
        candidat = Candidat.objects.create(
            nom="Compte",
            prenom="Demande",
            email=candidate_user.email,
            formation=self.formation,
            compte_utilisateur=candidate_user,
            created_by=self.user,
        )
        self.client.force_authenticate(user=candidate_user)

        response = self.client.post(reverse("demande_compte_candidat"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(
            response.data["message"],
            "Demande de création de compte enregistrée. Elle sera examinée par un membre du staff.",
        )
        self.assertIsNone(response.data["data"])

    def test_rapport_delete_uses_standard_envelope_and_archives(self):
        from rap_app.models.rapports import Rapport

        rapport = Rapport.objects.create(
            nom="Rapport suppression",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=timezone.localdate() - timedelta(days=30),
            date_fin=timezone.localdate(),
            centre=self.centre,
            formation=self.formation,
            format="pdf",
            donnees={"resume": "Rapport test"},
            created_by=self.user,
        )

        response = self.client.delete(reverse("rapport-detail", args=[rapport.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        rapport.refresh_from_db()
        self.assertFalse(rapport.is_active)

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

    def test_appairage_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("appairage-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées appairage récupérées avec succès.")
        self.assertIn("statut_choices", response.data["data"])
        self.assertIn("formation_choices", response.data["data"])
        self.assertIn("partenaire_choices", response.data["data"])
        self.assertIn("centre_choices", response.data["data"])

    def test_appairage_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("appairage-detail", args=[self.appairage.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Appairage récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.appairage.id)

    def test_appairage_list_uses_standard_paginated_envelope(self):
        response = self.client.get(reverse("appairage-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        self.assertGreaterEqual(response.data["data"]["count"], 1)

    def test_appairage_create_uses_standard_envelope(self):
        other_candidat = Candidat.objects.create(
            nom="Appairage",
            prenom="Second",
            statut=Candidat.StatutCandidat.AUTRE,
            formation=self.formation,
            created_by=self.user,
        )
        response = self.client.post(
            reverse("appairage-list"),
            {
                "candidat": other_candidat.id,
                "partenaire": self.partenaire.id,
                "formation": self.formation.id,
                "statut": "transmis",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Appairage créé avec succès.")
        self.assertEqual(response.data["data"]["candidat"], other_candidat.id)

    def test_appairage_delete_uses_standard_envelope(self):
        response = self.client.delete(reverse("appairage-detail", args=[self.appairage.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Appairage archivé avec succès.")
        self.assertEqual(response.data["data"]["status"], "archived")

    def test_appairage_comment_create_validation_error_uses_standard_envelope(self):
        response = self.client.post(
            reverse("appairage-commentaires", args=[self.appairage.id]),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertIsInstance(response.data["errors"], dict)

    def test_me_get_uses_standard_envelope(self):
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Profil récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.user.id)

    def test_me_patch_uses_standard_envelope(self):
        response = self.client.patch(reverse("me"), {"first_name": "Patched"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Profil mis à jour avec succès.")
        self.assertEqual(response.data["data"]["first_name"], "Patched")

    def test_me_reactivate_success_uses_standard_envelope(self):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(reverse("me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Votre compte a été réactivé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.user.id)

    def test_appairage_create_duplicate_business_error_uses_non_field_errors(self):
        response = self.client.post(
            reverse("appairage-list"),
            {
                "candidat": self.candidat.id,
                "partenaire": self.partenaire.id,
                "formation": self.formation.id,
                "statut": "transmis",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors", "error_code"})
        self.assertFalse(response.data["success"])
        self.assertIsNone(response.data["data"])
        self.assertEqual(
            response.data["message"],
            "Un appairage existe déjà pour ce candidat, ce partenaire et cette formation.",
        )
        self.assertEqual(
            response.data["errors"]["non_field_errors"],
            ["Un appairage existe déjà pour ce candidat, ce partenaire et cette formation."],
        )
        self.assertEqual(response.data["error_code"], "duplicate_appairage")

    def test_appairage_comment_create_supports_rich_text_like_other_comment_modules(self):
        response = self.client.post(
            reverse("appairage-commentaires", args=[self.appairage.id]),
            {
                "body": '<p><strong>Bonjour</strong> <script>alert(1)</script><a href="https://example.com">lien</a></p>'
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire d'appairage créé avec succès.")
        self.assertEqual(
            response.data["data"]["body"],
            '<p><strong>Bonjour</strong> alert(1)<a href="https://example.com" rel="nofollow">lien</a></p>',
        )

    def test_appairage_comment_list_action_uses_standard_envelope(self):
        CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage liste",
            created_by=self.user,
        )

        response = self.client.get(reverse("appairage-commentaires", args=[self.appairage.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires d'appairage récupérés avec succès.")
        self.assertIsInstance(response.data["data"], list)

    def test_prospection_comment_unarchive_already_active_uses_standard_envelope(self):
        comment = ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire déjà actif",
            created_by=self.user,
        )

        response = self.client.post(f"/api/prospection-comments/{comment.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà actif.")
        self.assertIsNone(response.data["data"])

    def test_prospection_comment_delete_archives_and_uses_standard_envelope(self):
        comment = ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire à archiver via delete",
            created_by=self.user,
        )

        response = self.client.delete(f"/api/prospection-commentaires/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire archivé.")
        comment.refresh_from_db()
        self.assertEqual(comment.statut_commentaire, "archive")

    def test_prospection_comment_list_can_include_archived_items(self):
        comment = ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire archivé visible via filtre",
            created_by=self.user,
        )
        comment.archiver(save=True)

        response = self.client.get("/api/prospection-commentaires/", {"est_archive": "both"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires de prospection récupérés avec succès.")
        payload = response.data.get("data", response.data)
        if isinstance(payload, dict) and "data" in payload:
            payload = payload["data"]
        self.assertIn("results", payload)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertIn(comment.id, returned_ids)

    def test_prospection_comment_retrieve_uses_standard_envelope(self):
        comment = ProspectionComment.objects.create(
            prospection=self.prospection,
            body="Commentaire de détail",
            created_by=self.user,
        )

        response = self.client.get(f"/api/prospection-commentaires/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire de prospection récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], comment.id)

    def test_appairage_comment_unarchive_already_active_uses_standard_envelope(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire déjà actif",
            created_by=self.user,
        )

        response = self.client.post(f"/api/appairage-commentaires/{comment.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà actif.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["Déjà actif."])

    def test_appairage_comment_delete_archives_and_uses_standard_envelope(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage à archiver via delete",
            created_by=self.user,
        )

        response = self.client.delete(f"/api/appairage-commentaires/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire archivé.")
        comment.refresh_from_db()
        self.assertEqual(comment.statut_commentaire, "archive")

    def test_appairage_comment_list_can_include_archived_items(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage archivé visible via filtre",
            created_by=self.user,
        )
        comment.archiver(save=True)

        response = self.client.get("/api/appairage-commentaires/", {"est_archive": "both"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires d'appairage récupérés avec succès.")
        payload = response.data.get("data", response.data)
        if isinstance(payload, dict) and "data" in payload:
            payload = payload["data"]
        results = payload.get("results", payload) if isinstance(payload, dict) else payload
        results = results if isinstance(results, list) else [results]
        returned_ids = [item["id"] for item in results if isinstance(item, dict)]
        self.assertIn(comment.id, returned_ids)

    def test_appairage_comment_retrieve_uses_standard_envelope(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire appairage detail",
            created_by=self.user,
        )

        response = self.client.get(f"/api/appairage-commentaires/{comment.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire d'appairage récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], comment.id)

    def test_appairage_comment_archive_already_archived_uses_standard_envelope(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire déjà archivé",
            created_by=self.user,
            statut_commentaire="archive",
        )

        response = self.client.post(f"/api/appairage-commentaires/{comment.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà archivé.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["Déjà archivé."])

    def test_prospection_unarchive_already_active_uses_standard_envelope(self):
        response = self.client.post(f"/api/prospections/{self.prospection.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors", "error_code"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "La prospection n’est pas archivée.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["La prospection n’est pas archivée."])
        self.assertEqual(response.data["error_code"], "prospection_not_archived")

    def test_prospection_archive_already_archived_uses_standard_envelope(self):
        self.prospection.activite = "archivee"
        self.prospection.save(update_fields=["activite"])

        response = self.client.post(f"/api/prospections/{self.prospection.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors", "error_code"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "La prospection est déjà archivée.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["La prospection est déjà archivée."])
        self.assertEqual(response.data["error_code"], "prospection_already_archived")

    def test_appairage_archive_already_archived_uses_standard_envelope(self):
        self.appairage.activite = "archive"
        self.appairage.save(update_fields=["activite"])

        response = self.client.post(f"/api/appairages/{self.appairage.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors", "error_code"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà archivé.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["Déjà archivé."])
        self.assertEqual(response.data["error_code"], "already_archived")

    def test_appairage_unarchive_already_active_uses_standard_envelope(self):
        response = self.client.post(f"/api/appairages/{self.appairage.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data", "errors", "error_code"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Cet appairage n’est pas archivé.")
        self.assertIsNone(response.data["data"])
        self.assertEqual(response.data["errors"]["non_field_errors"], ["Cet appairage n’est pas archivé."])
        self.assertEqual(response.data["error_code"], "appairage_not_archived")

    def test_appairage_archive_success_uses_standard_envelope(self):
        response = self.client.post(f"/api/appairages/{self.appairage.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Appairage archivé avec succès.")
        self.assertEqual(response.data["data"]["status"], "archived")

    def test_appairage_unarchive_success_uses_standard_envelope(self):
        self.appairage.archiver(user=self.user)

        response = self.client.post(f"/api/appairages/{self.appairage.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Appairage désarchivé avec succès.")
        self.assertEqual(response.data["data"]["status"], "unarchived")

    def test_appairage_list_can_include_archived_items(self):
        self.appairage.archiver(user=self.user)

        response = self.client.get("/api/appairages/", {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        payload = response.data.get("data", response.data)
        self.assertIn("results", payload)
        returned_ids = [item["id"] for item in payload["results"]]
        self.assertIn(self.appairage.id, returned_ids)

    def test_formation_archive_already_archived_uses_standard_envelope(self):
        self.formation.archiver(user=self.user, commentaire="Préparation test")

        response = self.client.post(f"/api/formations/{self.formation.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà archivée.")
        self.assertIsNone(response.data["data"])

    def test_formation_archive_success_uses_standard_envelope(self):
        response = self.client.post(f"/api/formations/{self.formation.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Formation archivée avec succès.")
        self.assertEqual(response.data["data"], {"status": "archived"})

    def test_formation_unarchive_success_uses_standard_envelope(self):
        self.formation.archiver(user=self.user, commentaire="Préparation désarchivage")

        response = self.client.post(f"/api/formations/{self.formation.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Formation désarchivée avec succès.")
        self.assertEqual(response.data["data"], {"status": "unarchived"})

    def test_formation_historique_uses_standard_envelope(self):
        response = self.client.get(f"/api/formations/{self.formation.id}/historique/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Historique de la formation récupéré.")
        self.assertIsInstance(response.data["data"], list)

    def test_formation_commentaires_action_uses_standard_envelope(self):
        Commentaire.objects.create(
            formation=self.formation,
            contenu="Commentaire formation action",
            created_by=self.user,
        )

        response = self.client.get(f"/api/formations/{self.formation.id}/commentaires/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires de la formation récupérés.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_formation_partenaires_action_uses_standard_envelope(self):
        self.formation.partenaires.add(self.partenaire)

        response = self.client.get(f"/api/formations/{self.formation.id}/partenaires/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Partenaires de la formation récupérés.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_formation_documents_action_uses_standard_envelope(self):
        self.client.post(
            reverse("document-list"),
            {
                "formation": self.formation.id,
                "nom_fichier": "formation-listing.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "formation-listing.pdf",
                    b"%PDF-1.4 formation listing",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )

        response = self.client.get(f"/api/formations/{self.formation.id}/documents/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Documents de la formation récupérés.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_formation_prospections_action_uses_standard_envelope(self):
        response = self.client.get(f"/api/formations/{self.formation.id}/prospections/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Prospections liées à la formation récupérées.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_formation_ajouter_commentaire_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/formations/{self.formation.id}/ajouter_commentaire/",
            {"contenu": "Commentaire formation contrat", "saturation": 68},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire ajouté à la formation.")
        self.assertEqual(response.data["data"]["formation_id"], self.formation.id)
        self.assertIn("Commentaire formation contrat", response.data["data"]["contenu"])

    def test_formation_ajouter_evenement_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/formations/{self.formation.id}/ajouter_evenement/",
            {
                "type_evenement": "forum",
                "event_date": (timezone.now().date() + timedelta(days=7)).isoformat(),
                "details": "Evenement contrat formation",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Événement ajouté à la formation.")
        self.assertEqual(response.data["data"]["formation_id"], self.formation.id)
        self.assertEqual(response.data["data"]["details"], "Evenement contrat formation")

    def test_formation_ajouter_document_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/formations/{self.formation.id}/ajouter_document/",
            {
                "nom_fichier": "formation-ajout.pdf",
                "type_document": "pdf",
                "fichier": SimpleUploadedFile(
                    "formation-ajout.pdf",
                    b"%PDF-1.4 formation ajout",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Document ajouté à la formation.")
        self.assertEqual(response.data["data"]["formation_id"], self.formation.id)
        self.assertEqual(response.data["data"]["nom_fichier"], "formation-ajout.pdf")

    def test_formation_dupliquer_uses_standard_envelope(self):
        response = self.client.post(f"/api/formations/{self.formation.id}/dupliquer/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Formation dupliquée")
        self.assertNotEqual(response.data["data"]["id"], self.formation.id)
        self.assertEqual(response.data["data"]["nom"], f"{self.formation.nom} (Copie)")

    def test_atelier_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("ateliers-tre-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées ateliers TRE récupérées avec succès.")
        self.assertIn("type_atelier_choices", response.data["data"])
        self.assertIn("centre_choices", response.data["data"])
        self.assertIn("candidat_choices", response.data["data"])
        self.assertIn("presence_statut_choices", response.data["data"])

    def test_atelier_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("ateliers-tre-detail", args=[self.atelier.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Atelier TRE récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("ateliers-tre-list"),
            {
                "type_atelier": AtelierTRE.TypeAtelier.ATELIER_2,
                "centre": self.centre.id,
                "date_atelier": (timezone.now().date() + timedelta(days=10)).isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Atelier TRE créé avec succès.")
        self.assertEqual(response.data["data"]["centre"], self.centre.id)

    def test_atelier_patch_uses_standard_envelope(self):
        response = self.client.patch(
            reverse("ateliers-tre-detail", args=[self.atelier.id]),
            {"date_atelier": (timezone.now().date() + timedelta(days=14)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Atelier TRE mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_delete_already_archived_uses_standard_envelope(self):
        self.atelier.is_active = False
        self.atelier.save(update_fields=["is_active"])

        response = self.client.delete(reverse("ateliers-tre-detail", args=[self.atelier.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_atelier_delete_uses_standard_success_message(self):
        response = self.client.delete(reverse("ateliers-tre-detail", args=[self.atelier.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Atelier TRE archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_add_candidats_invalid_payload_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/add-candidats/",
            {"candidats": "pas-une-liste"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "'candidats' doit être une liste d'entiers.")
        self.assertIsNone(response.data["data"])

    def test_atelier_add_candidats_success_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/add-candidats/",
            {"candidats": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Candidats ajoutés à l'atelier avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_add_candidats_empty_list_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/add-candidats/",
            {"candidats": []},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Aucun candidat ajouté, atelier inchangé.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_remove_candidats_success_uses_standard_envelope(self):
        self.atelier.candidats.add(self.candidat)

        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/remove-candidats/",
            {"candidats": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Candidats retirés de l'atelier avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_remove_candidats_empty_list_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/remove-candidats/",
            {"candidats": []},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Aucun candidat retiré, atelier inchangé.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_set_presences_invalid_payload_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/set-presences/",
            {"items": "pas-une-liste"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "'items' doit être une liste d'objets {candidat, statut, commentaire?}.")

    def test_atelier_set_presences_empty_list_uses_standard_envelope(self):
        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/set-presences/",
            {"items": []},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Aucune présence modifiée, atelier inchangé.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_mark_present_success_uses_standard_envelope(self):
        self.atelier.candidats.add(self.candidat)

        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/mark-present/",
            {"candidats": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Présences marquées comme présentes avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_atelier_mark_absent_success_uses_standard_envelope(self):
        self.atelier.candidats.add(self.candidat)

        response = self.client.post(
            f"/api/ateliers-tre/{self.atelier.id}/mark-absent/",
            {"candidats": [self.candidat.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Présences marquées comme absentes avec succès.")
        self.assertEqual(response.data["data"]["id"], self.atelier.id)

    def test_partenaires_filter_options_uses_standard_envelope(self):
        response = self.client.get(reverse("partenaire-filter-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres partenaires récupérés avec succès.")
        self.assertIn("cities", response.data["data"])

    def test_partenaires_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("partenaire-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix partenaires récupérés avec succès.")
        self.assertIn("types", response.data["data"])
        self.assertIn("actions", response.data["data"])

    def test_centres_liste_simple_uses_standard_envelope(self):
        response = self.client.get(reverse("centre-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste simple des centres récupérée avec succès.")
        self.assertIn("results", response.data["data"])

    def test_centres_list_uses_standard_envelope(self):
        response = self.client.get(reverse("centre-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des centres récupérée avec succès.")
        nested_payload = response.data["data"].get("data", response.data["data"])
        self.assertIn("results", nested_payload)

    def test_centres_retrieve_uses_standard_envelope(self):
        response = self.client.get(reverse("centre-detail", args=[self.centre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], self.centre.id)

    def test_centres_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("centre-list"),
            {"nom": "Centre Create Contract", "code_postal": "13001"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre créé avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Centre Create Contract")

    def test_centres_update_uses_standard_envelope(self):
        response = self.client.put(
            reverse("centre-detail", args=[self.centre.id]),
            {"nom": "Centre Updated Contract", "code_postal": "13002"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre mis à jour avec succès.")
        self.assertEqual(response.data["data"]["nom"], "Centre Updated Contract")

    def test_centres_delete_uses_standard_envelope_and_archives(self):
        response = self.client.delete(reverse("centre-detail", args=[self.centre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], self.centre.id)
        self.centre.refresh_from_db()
        self.assertFalse(self.centre.is_active)

    def test_centres_list_can_include_archived_items(self):
        archived = Centre.objects.create(
            nom="Centre archive",
            code_postal="75001",
            is_active=False,
        )

        response = self.client.get(reverse("centre-list"), {"avec_archivees": "true"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(archived.id, returned_ids)

    def test_centres_desarchiver_uses_standard_envelope(self):
        centre = Centre.objects.create(
            nom="Centre archive",
            code_postal="75001",
            is_active=False,
        )

        response = self.client.post(reverse("centre-desarchiver", args=[centre.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Centre désarchivé avec succès.")
        self.assertTrue(response.data["data"]["is_active"])

    def test_users_liste_simple_uses_standard_envelope(self):
        response = self.client.get(reverse("user-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste simple des utilisateurs récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)
        self.assertTrue(any(item["id"] == self.user.id for item in response.data["data"]))
        self.assertTrue(all("id" in item and "nom" in item for item in response.data["data"]))

    def test_users_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("user-get-user-filtres"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres utilisateurs récupérés avec succès.")
        self.assertIn("role", response.data["data"])
        self.assertIn("is_active", response.data["data"])
        self.assertIn("formation", response.data["data"])
        self.assertIn("centre", response.data["data"])
        self.assertIn("type_offre", response.data["data"])

    def test_evenements_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("evenement-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des types d’événements récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)
        self.assertTrue(all("value" in item and "label" in item for item in response.data["data"]))

    def test_evenements_stats_par_type_uses_standard_envelope(self):
        response = self.client.get(reverse("evenement-stats-par-type"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques événements par type récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_evenement_list_uses_standard_envelope(self):
        response = self.client.get(reverse("evenement-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste des événements récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)

    def test_evenement_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("evenement-list"),
            {
                "formation_id": self.formation.id,
                "type_evenement": "forum",
                "event_date": (timezone.now().date() + timedelta(days=5)).isoformat(),
                "lieu": "Lille",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Événement créé avec succès.")
        self.assertEqual(response.data["data"]["formation_id"], self.formation.id)

    def test_evenement_update_uses_standard_envelope(self):
        evenement = self.formation.evenements.create(
            type_evenement="forum",
            event_date=timezone.now().date() + timedelta(days=2),
            lieu="Paris",
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("evenement-detail", args=[evenement.id]),
            {"lieu": "Lyon"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Événement mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], evenement.id)
        self.assertEqual(response.data["data"]["lieu"], "Lyon")

    def test_evenement_retrieve_uses_standard_envelope(self):
        evenement = self.formation.evenements.create(
            type_evenement="forum",
            event_date=timezone.now().date() + timedelta(days=2),
            lieu="Paris",
            created_by=self.user,
        )

        response = self.client.get(reverse("evenement-detail", args=[evenement.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Événement récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], evenement.id)

    def test_evenement_delete_uses_standard_envelope_and_archives(self):
        evenement = self.formation.evenements.create(
            type_evenement="forum",
            event_date=timezone.now().date() + timedelta(days=2),
            lieu="Paris",
            created_by=self.user,
        )

        response = self.client.delete(reverse("evenement-detail", args=[evenement.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Événement archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], evenement.id)
        evenement.refresh_from_db()
        self.assertFalse(evenement.is_active)

    def test_cerfa_prefill_uses_standard_envelope(self):
        response = self.client.get(
            reverse("cerfa-contrat-prefill"),
            {"candidat": self.candidat.id, "formation": self.formation.id, "employeur": self.partenaire.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Pre-remplissage CERFA calcule avec succes.")
        self.assertIsInstance(response.data["data"], dict)

    def test_cerfa_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("cerfa-contrat-list"),
            {
                "apprenti_nom_naissance": "Doe",
                "apprenti_prenom": "Jane",
                "employeur_nom": "Entreprise Create",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["apprenti_prenom"], "Jane")

    def test_cerfa_list_uses_standard_paginated_envelope(self):
        from rap_app.models.cerfa_contrats import CerfaContrat

        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Durand",
            apprenti_prenom="Alice",
            employeur_nom="Entreprise Test",
        )

        response = self.client.get(reverse("cerfa-contrat-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Liste paginée des résultats.")
        self.assertIn("results", response.data["data"])
        returned_ids = [item["id"] for item in response.data["data"]["results"]]
        self.assertIn(contrat.id, returned_ids)

    def test_cerfa_retrieve_uses_standard_envelope(self):
        from rap_app.models.cerfa_contrats import CerfaContrat

        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Durand",
            apprenti_prenom="Alice",
            employeur_nom="Entreprise Detail",
        )

        response = self.client.get(reverse("cerfa-contrat-detail", args=[contrat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], contrat.id)

    def test_cerfa_update_uses_standard_envelope(self):
        from rap_app.models.cerfa_contrats import CerfaContrat

        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Durand",
            apprenti_prenom="Alice",
            employeur_nom="Entreprise Update",
        )

        response = self.client.patch(
            reverse("cerfa-contrat-detail", args=[contrat.id]),
            {"employeur_nom": "Entreprise Modifiee"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employeur_nom"], "Entreprise Modifiee")

    def test_cerfa_delete_uses_standard_envelope_and_archives(self):
        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Martin",
            apprenti_prenom="Lou",
            employeur_nom="Entreprise Archive",
        )

        response = self.client.delete(reverse("cerfa-contrat-detail", args=[contrat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "CERFA archive avec succes.")
        contrat.refresh_from_db()
        self.assertFalse(contrat.is_active)

    def test_cerfa_hard_delete_uses_standard_envelope(self):
        contrat = CerfaContrat.objects.create(
            apprenti_nom_naissance="Martin",
            apprenti_prenom="Lou",
            employeur_nom="Entreprise Hard Delete",
        )
        self.client.delete(reverse("cerfa-contrat-detail", args=[contrat.id]))

        response = self.client.post(reverse("cerfa-contrat-hard-delete", args=[contrat.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("Suppression definitive", response.data["message"])
        self.assertEqual(response.data["data"]["id"], contrat.id)
        self.assertTrue(response.data["data"]["hard_deleted"])
        self.assertFalse(CerfaContrat._base_manager.filter(pk=contrat.id).exists())

    def test_commentaires_export_missing_selection_uses_standard_envelope(self):
        response = self.client.post(
            reverse("commentaire-export"),
            {"format": "pdf"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Aucun commentaire sélectionné")
        self.assertIsNone(response.data["data"])

    def test_commentaires_export_xlsx_returns_attachment_response(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="Commentaire export contrat",
            created_by=self.user,
        )

        response = self.client.post(
            reverse("commentaire-export"),
            {"format": "xlsx", "ids": [commentaire.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_commentaires_export_pdf_returns_attachment_response(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="Commentaire export pdf contrat",
            created_by=self.user,
        )

        response = self.client.post(
            reverse("commentaire-export"),
            {"format": "pdf", "ids": [commentaire.id]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".pdf", response["Content-Disposition"])

    def test_commentaires_filter_options_uses_standard_envelope(self):
        response = self.client.get(reverse("commentaire-filter-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Options de filtres récupérées avec succès.")
        self.assertIn("centres", response.data["data"])
        self.assertIn("type_offres", response.data["data"])
        self.assertIn("formations", response.data["data"])

    def test_commentaires_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("commentaire-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Métadonnées récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_commentaires_saturation_stats_uses_standard_envelope(self):
        response = self.client.get(
            reverse("commentaire-saturation-stats"),
            {"formation_id": self.formation.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Statistiques de saturation récupérées avec succès.")
        self.assertIsInstance(response.data["data"], dict)

    def test_commentaires_list_uses_standard_envelope(self):
        response = self.client.get(reverse("commentaire-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaires récupérés")
        nested_payload = response.data["data"].get("data", response.data["data"])
        self.assertIn("results", nested_payload)
        self.assertGreaterEqual(nested_payload["count"], 0)

    def test_commentaires_retrieve_uses_standard_envelope(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="<p>Commentaire contrat</p>",
            created_by=self.user,
        )

        response = self.client.get(reverse("commentaire-detail", args=[commentaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], commentaire.id)

    def test_commentaires_delete_uses_standard_envelope_and_archives(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="<p>Commentaire a archiver</p>",
            created_by=self.user,
        )

        response = self.client.delete(reverse("commentaire-detail", args=[commentaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], f"Commentaire #{commentaire.id} archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], commentaire.id)
        commentaire.refresh_from_db()
        self.assertTrue(commentaire.est_archive)

    def test_commentaires_hard_delete_uses_standard_envelope(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="<p>Commentaire hard delete</p>",
            created_by=self.user,
        )
        self.client.delete(reverse("commentaire-detail", args=[commentaire.id]))

        response = self.client.post(reverse("commentaire-hard-delete", args=[commentaire.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("Suppression definitive", response.data["message"])
        self.assertEqual(response.data["data"]["id"], commentaire.id)
        self.assertTrue(response.data["data"]["hard_deleted"])
        self.assertFalse(Commentaire._base_manager.filter(pk=commentaire.id).exists())

    def test_commentaires_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("commentaire-list"),
            {"formation": self.formation.id, "contenu": "<p>Nouveau commentaire contrat</p>", "saturation": 72},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire créé avec succès.")
        self.assertEqual(response.data["data"]["formation"], self.formation.id)

    def test_commentaires_update_uses_standard_envelope(self):
        commentaire = Commentaire.objects.create(
            formation=self.formation,
            contenu="<p>Commentaire a modifier</p>",
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("commentaire-detail", args=[commentaire.id]),
            {"contenu": "<p>Commentaire modifié</p>"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Commentaire mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], commentaire.id)

    def test_prepa_objectifs_filters_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectif-prepa-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres objectifs Prépa récupérés avec succès.")
        self.assertIn("annee", response.data["data"])
        self.assertIn("centre", response.data["data"])
        self.assertIn("departement", response.data["data"])

    def test_prepa_objectifs_list_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectif-prepa-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        nested_payload = response.data["data"].get("data", response.data["data"])
        self.assertGreaterEqual(nested_payload["count"], 1)
        self.assertIsInstance(nested_payload["results"], list)

    def test_prepa_objectifs_retrieve_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        objectif = ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectif-prepa-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Prépa récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_prepa_objectifs_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("objectif-prepa-list"),
            {
                "centre_id": self.centre.id,
                "annee": timezone.localdate().year,
                "valeur_objectif": 14,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Prépa créé avec succès.")
        self.assertEqual(response.data["data"]["centre"]["id"], self.centre.id)
        self.assertEqual(response.data["data"]["valeur_objectif"], 14)

    def test_prepa_objectifs_update_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        objectif = ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("objectif-prepa-detail", args=[objectif.id]),
            {"valeur_objectif": 18},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Prépa mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)
        self.assertEqual(response.data["data"]["valeur_objectif"], 18)

    def test_prepa_objectifs_delete_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        objectif = ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.delete(reverse("objectif-prepa-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Prépa archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_prepa_objectifs_synthese_uses_standard_envelope(self):
        from rap_app.models.prepa import ObjectifPrepa

        ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectif-prepa-synthese"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Synthèse objectifs Prépa récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_prepa_objectifs_export_empty_uses_standard_envelope(self):
        response = self.client.get(reverse("objectif-prepa-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Aucun objectif à exporter.")
        self.assertIsNone(response.data["data"])

    def test_prepa_objectifs_export_xlsx_returns_attachment_response(self):
        from rap_app.models.prepa import ObjectifPrepa

        ObjectifPrepa.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=12,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectif-prepa-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_declic_objectifs_export_empty_uses_standard_envelope(self):
        response = self.client.get(reverse("objectifs-declic-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Aucun objectif à exporter.")
        self.assertIsNone(response.data["data"])

    def test_declic_objectifs_filters_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectifs-declic-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Filtres objectifs Déclic récupérés avec succès.")
        self.assertIn("annee", response.data["data"])
        self.assertIn("centre", response.data["data"])
        self.assertIn("departement", response.data["data"])

    def test_declic_objectifs_list_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectifs-declic-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        nested_payload = response.data["data"].get("data", response.data["data"])
        self.assertGreaterEqual(nested_payload["count"], 1)
        self.assertIsInstance(nested_payload["results"], list)

    def test_declic_objectifs_retrieve_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        objectif = ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectifs-declic-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Déclic récupéré avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_declic_objectifs_create_uses_standard_envelope(self):
        response = self.client.post(
            reverse("objectifs-declic-list"),
            {
                "centre_id": self.centre.id,
                "annee": timezone.localdate().year,
                "valeur_objectif": 10,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Déclic créé avec succès.")
        self.assertEqual(response.data["data"]["centre"]["id"], self.centre.id)
        self.assertEqual(response.data["data"]["valeur_objectif"], 10)

    def test_declic_objectifs_update_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        objectif = ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.patch(
            reverse("objectifs-declic-detail", args=[objectif.id]),
            {"valeur_objectif": 11},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Déclic mis à jour avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)
        self.assertEqual(response.data["data"]["valeur_objectif"], 11)

    def test_declic_objectifs_delete_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        objectif = ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.delete(reverse("objectifs-declic-detail", args=[objectif.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Objectif Déclic archivé avec succès.")
        self.assertEqual(response.data["data"]["id"], objectif.id)

    def test_declic_objectifs_synthese_uses_standard_envelope(self):
        from rap_app.models.declic import ObjectifDeclic

        ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectifs-declic-synthese"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Synthèse objectifs Déclic récupérée avec succès.")
        self.assertIsInstance(response.data["data"], list)
        self.assertGreaterEqual(len(response.data["data"]), 1)

    def test_declic_objectifs_export_xlsx_returns_attachment_response(self):
        from rap_app.models.declic import ObjectifDeclic

        ObjectifDeclic.objects.create(
            centre=self.centre,
            annee=timezone.localdate().year,
            valeur_objectif=8,
            created_by=self.user,
        )

        response = self.client.get(reverse("objectifs-declic-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_prepa_stats_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("prepa-stats-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])

    def test_declic_stats_export_xlsx_returns_attachment_response(self):
        response = self.client.get(reverse("declic-stats-export-xlsx"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn("attachment;", response["Content-Disposition"])
        self.assertIn(".xlsx", response["Content-Disposition"])
