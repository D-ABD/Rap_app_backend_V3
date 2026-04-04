"""Tests relatifs a rapports viewsets."""
from datetime import date, timedelta

from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from rest_framework import status

from ...models.centres import Centre
from ...models.custom_user import CustomUser
from ...models.formations import Formation
from ...models.logs import LogUtilisateur
from ...models.rapports import Rapport
from ...models.statut import Statut
from ...models.types_offre import TypeOffre
from ..factories import UserFactory
from ..test_utils import AuthenticatedTestCase


class RapportViewSetTestCase(AuthenticatedTestCase):
    """Cas de test pour Rapport View Set Test Case."""
    def setUp(self):
        super().setUp()
        self.user = UserFactory(role=CustomUser.ROLE_ADMIN)
        self.client.force_authenticate(user=self.user)
        self.centre = Centre.objects.create(nom="Centre Test", created_by=self.user)
        self.type_offre = TypeOffre.objects.create(nom="non_defini", created_by=self.user)
        self.statut = Statut.objects.create(nom="non_defini", created_by=self.user)
        self.formation = Formation.objects.create(
            nom="Formation A", centre=self.centre, type_offre=self.type_offre, statut=self.statut, created_by=self.user
        )

        self.rapport = Rapport.objects.create(
            nom="Rapport Initial",
            type_rapport=Rapport.TYPE_OCCUPATION,
            periode=Rapport.PERIODE_MENSUEL,
            date_debut=date.today() - timedelta(days=30),
            date_fin=date.today(),
            format=Rapport.FORMAT_PDF,
            centre=self.centre,
            type_offre=self.type_offre,
            statut=self.statut,
            formation=self.formation,
            donnees={"initial": True},
            temps_generation=2.5,
            created_by=self.user,
        )

        self.list_url = reverse("rapport-list")
        self.detail_url = reverse("rapport-detail", args=[self.rapport.id])

    def test_list_rapports(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("results", response.data["data"])

    def test_retrieve_rapport(self):
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["id"], self.rapport.id)
        self.assertEqual(response.data["data"]["nom"], self.rapport.nom)
        self.assertIn("reporting_contract", response.data["data"])

    def test_create_rapport(self):
        data = {
            "nom": "Rapport Créé",
            "type_rapport": Rapport.TYPE_STATUT,
            "periode": Rapport.PERIODE_HEBDOMADAIRE,
            "date_debut": date.today() - timedelta(days=6),
            "date_fin": date.today(),
            "format": Rapport.FORMAT_HTML,
            "centre": self.centre.id,
            "type_offre": self.type_offre.id,
            "statut": self.statut.id,
            "formation": self.formation.id,
            "donnees": {"nb": 5},
            "temps_generation": 1.2,
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIn("phase_summary", response.data["data"]["donnees"])

        rapport_id = response.data["data"]["id"]
        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Rapport),
            object_id=rapport_id,
            action="création",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de création manquant")

    def test_update_rapport(self):
        url = reverse("rapport-detail", args=[self.rapport.id])
        data = {"nom": "Rapport Modifié"}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["nom"], "Rapport Modifié")
        self.assertIn("phase_summary", response.data["data"]["donnees"])

        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Rapport),
            object_id=self.rapport.pk,
            action="modification",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de modification manquant")

    def test_delete_rapport(self):
        url = reverse("rapport-detail", args=[self.rapport.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Rapport archivé avec succès.")

        self.rapport.refresh_from_db()
        self.assertFalse(self.rapport.is_active)

        log = LogUtilisateur.objects.filter(
            content_type=ContentType.objects.get_for_model(Rapport),
            object_id=self.rapport.pk,
            action="suppression",
            created_by=self.user,
        )
        self.assertTrue(log.exists(), "Log de suppression manquant")

    def test_validation_dates_invalides(self):
        data = {
            "nom": "Rapport Invalide",
            "type_rapport": Rapport.TYPE_STATUT,
            "periode": Rapport.PERIODE_MENSUEL,
            "date_debut": date.today(),
            "date_fin": date.today() - timedelta(days=10),
            "format": Rapport.FORMAT_PDF,
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("date_debut", response.data.get("errors", {}))
        self.assertIn("date_fin", response.data.get("errors", {}))

    def test_permission_required(self):
        """Accès non authentifié → 401 Unauthorized."""
        self.client.logout()
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_choices_expose_phase_reporting_contract(self):
        response = self.client.get(reverse("rapport-choices"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["message"], "Choix des rapports récupérés avec succès.")
        self.assertIn("parcours_phase", response.data["data"])
        self.assertIn("reporting_contract", response.data["data"])
        self.assertEqual(
            response.data["data"]["reporting_contract"]["recommended_candidate_phase_field"], "parcours_phase"
        )
        self.assertTrue(response.data["data"]["reporting_contract"]["legacy_status_deprecated"])
        self.assertEqual(
            response.data["data"]["reporting_contract"]["legacy_status_removal_stage"],
            "post_front_migration",
        )
