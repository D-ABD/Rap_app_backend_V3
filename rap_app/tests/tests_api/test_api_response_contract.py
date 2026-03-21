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
from rap_app.models.partenaires import Partenaire
from rap_app.models.prospection import Prospection, ProspectionChoices
from rap_app.models.prospection_comments import ProspectionComment
from rap_app.models.commentaires_appairage import CommentaireAppairage
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
        self.assertIn("parcours_phase_choices", response.data["data"])
        self.assertIn("phase_contract", response.data["data"])
        self.assertIn("phase_filter_aliases", response.data["data"])
        self.assertIn("phase_ordering_fields", response.data["data"])
        self.assertIn("phase_transition_actions", response.data["data"])
        self.assertIn("rgpd_legal_basis_choices", response.data["data"])
        self.assertIn("rgpd_notice_status_choices", response.data["data"])
        self.assertIn("rgpd_creation_source_choices", response.data["data"])
        self.assertIn("rgpd_consent_fields", response.data["data"])
        self.assertEqual(response.data["data"]["phase_contract"]["legacy_status_field"], "statut")
        self.assertEqual(response.data["data"]["phase_contract"]["recommended_phase_field"], "parcours_phase")
        self.assertTrue(response.data["data"]["phase_contract"]["legacy_status_supported"])
        self.assertTrue(response.data["data"]["phase_contract"]["legacy_status_deprecated"])
        self.assertEqual(response.data["data"]["phase_contract"]["legacy_status_removal_stage"], "post_front_migration")
        self.assertTrue(response.data["data"]["phase_contract"]["legacy_status_write_locked"])
        self.assertEqual(
            response.data["data"]["phase_filter_aliases"]["parcours_phase"],
            ["parcours_phase", "parcoursPhase"],
        )
        self.assertIn("parcours_phase", response.data["data"]["phase_ordering_fields"])

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

    def test_prospections_filtres_uses_standard_envelope(self):
        response = self.client.get(reverse("prospection-get-filters"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
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
        data = response.data["data"]
        self.assertIn(
            {"value": self.partenaire.id, "label": self.partenaire.nom},
            data["partenaires"],
        )
        self.assertTrue(any(owner["value"] == self.user.id for owner in data["owners"]))

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

    def test_appairage_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("appairage-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])

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
        self.assertEqual(
            response.data["data"]["body"],
            '<p><strong>Bonjour</strong> alert(1)<a href="https://example.com" rel="nofollow">lien</a></p>',
        )

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

    def test_appairage_comment_unarchive_already_active_uses_standard_envelope(self):
        comment = CommentaireAppairage.objects.create(
            appairage=self.appairage,
            body="Commentaire déjà actif",
            created_by=self.user,
        )

        response = self.client.post(f"/api/appairage-commentaires/{comment.id}/desarchiver/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà actif.")
        self.assertIsNone(response.data["data"])

    def test_appairage_archive_already_archived_uses_standard_envelope(self):
        self.appairage.activite = "archive"
        self.appairage.save(update_fields=["activite"])

        response = self.client.post(f"/api/appairages/{self.appairage.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà archivé.")
        self.assertIsNone(response.data["data"])

    def test_formation_archive_already_archived_uses_standard_envelope(self):
        self.formation.archiver(user=self.user, commentaire="Préparation test")

        response = self.client.post(f"/api/formations/{self.formation.id}/archiver/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertFalse(response.data["success"])
        self.assertEqual(response.data["message"], "Déjà archivée.")
        self.assertIsNone(response.data["data"])

    def test_atelier_meta_uses_standard_envelope(self):
        response = self.client.get(reverse("ateliers-tre-meta"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("type_atelier_choices", response.data["data"])

    def test_partenaires_filter_options_uses_standard_envelope(self):
        response = self.client.get(reverse("partenaire-filter-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("cities", response.data["data"])

    def test_centres_liste_simple_uses_standard_envelope(self):
        response = self.client.get(reverse("centre-liste-simple"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIn("results", response.data["data"])

    def test_evenements_choices_uses_standard_envelope(self):
        response = self.client.get(reverse("evenement-choices"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data.keys()), {"success", "message", "data"})
        self.assertTrue(response.data["success"])
        self.assertIsInstance(response.data["data"], list)
