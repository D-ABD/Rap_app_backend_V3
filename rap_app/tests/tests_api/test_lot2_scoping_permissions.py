"""Tests relatifs a lot2 scoping permissions."""
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


class Lot2ScopingPermissionsTests(APITestCase):
    """Cas de test pour Lot2 Scoping Permissions Tests."""
    def setUp(self):
        self.admin = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.staff_centre_a = UserFactory(role=CustomUser.ROLE_STAFF)
        self.staff_read_centre_a = UserFactory(role=CustomUser.ROLE_STAFF_READ)
        self.candidate_user = UserFactory(role=CustomUser.ROLE_CANDIDAT)

        self.centre_a = Centre.objects.create(nom="Centre A", code_postal="75000")
        self.centre_b = Centre.objects.create(nom="Centre B", code_postal="69000")

        self.staff_centre_a.centres.add(self.centre_a)
        self.staff_read_centre_a.centres.add(self.centre_a)

        self.statut = Statut.objects.create(nom="non_defini", couleur="#000000")
        self.type_offre = TypeOffre.objects.create(nom="poec", couleur="#FF0000")

        today = timezone.localdate()
        self.formation_a = Formation.objects.create(
            nom="Formation A",
            centre=self.centre_a,
            statut=self.statut,
            type_offre=self.type_offre,
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )
        self.formation_b = Formation.objects.create(
            nom="Formation B",
            centre=self.centre_b,
            statut=self.statut,
            type_offre=self.type_offre,
            start_date=today,
            end_date=today + timedelta(days=30),
            created_by=self.admin,
        )

        self.partenaire = Partenaire.objects.create(nom="Partenaire Lot2", type="entreprise", created_by=self.admin)

        self.prospection_visible = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation_a,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Visible centre A",
            created_by=self.admin,
            owner=self.admin,
        )
        self.prospection_hidden = Prospection.objects.create(
            partenaire=self.partenaire,
            formation=self.formation_b,
            date_prospection=timezone.now(),
            type_prospection=ProspectionChoices.TYPE_PREMIER_CONTACT,
            motif=ProspectionChoices.MOTIF_PARTENARIAT,
            statut=ProspectionChoices.STATUT_EN_COURS,
            objectif=ProspectionChoices.OBJECTIF_PRESENTATION,
            commentaire="Hidden centre B",
            created_by=self.admin,
            owner=self.admin,
        )

        self.candidat_hidden = Candidat.objects.create(
            nom="Candidate",
            prenom="Hidden",
            email=self.candidate_user.email,
            formation=self.formation_b,
            compte_utilisateur=self.candidate_user,
            created_by=self.admin,
        )
        self.cv_hidden = CVTheque.objects.create(
            candidat=self.candidat_hidden,
            document_type="CV",
            fichier=SimpleUploadedFile("cv-hidden.pdf", b"%PDF-1.4 hidden", content_type="application/pdf"),
            titre="CV caché",
            created_by=self.admin,
        )

    def test_staff_cannot_retrieve_prospection_outside_centre_scope(self):
        self.client.force_authenticate(user=self.staff_centre_a)

        response = self.client.get(reverse("prospection-detail", args=[self.prospection_hidden.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_read_cannot_retrieve_prospection_outside_centre_scope(self):
        self.client.force_authenticate(user=self.staff_read_centre_a)

        response = self.client.get(reverse("prospection-detail", args=[self.prospection_hidden.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_still_retrieves_visible_prospection_in_scope(self):
        self.client.force_authenticate(user=self.staff_centre_a)

        response = self.client.get(reverse("prospection-detail", args=[self.prospection_visible.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["id"], self.prospection_visible.id)

    def test_candidate_meta_is_forbidden_for_candidate_role(self):
        self.client.force_authenticate(user=self.candidate_user)

        response = self.client.get(reverse("candidat-meta"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_cannot_preview_cvtheque_outside_centre_scope(self):
        self.client.force_authenticate(user=self.staff_centre_a)

        response = self.client.get(reverse("cvtheque-preview", args=[self.cv_hidden.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_staff_cannot_download_cvtheque_outside_centre_scope(self):
        self.client.force_authenticate(user=self.staff_centre_a)

        response = self.client.get(reverse("cvtheque-download", args=[self.cv_hidden.id]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
